import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, PaymentType, Prisma, Coupon } from '@prisma/client';
import { TossPaymentApiService } from './services/toss-payment-api.service';
import { PaymentRepository } from './repositories/payment.repository';
import {
  CreatePaymentDto,
  ConfirmPaymentRequestDto,
  CancelPaymentRequestDto,
  GetPaymentDto,
} from './dto/payment-request.dto';
import {
  PaymentResponseDto,
  InitiatePaymentResponseDto,
  PaymentListResponseDto,
} from './dto/payment-response.dto';
import { TossPaymentResponse } from './dto/toss-payment.dto';
import { OrdersService } from '../order/order.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EOrderSituation } from '../order/enum/order.enum';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly tossApiService: TossPaymentApiService,
    private readonly paymentRepository: PaymentRepository,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Initiate payment - Create order ID and return payment info
   * Client will use this to open Toss checkout page
   */
  async initiatePayment(
    userId: string,
    cartItems: Array<{ cartItemId: string; couponIds?: string[] }>,
    points?: number,
    deliveryFee?: number,
    userShippingAddressId?: string,
  ): Promise<InitiatePaymentResponseDto> {
    this.logger.log(`Initiating payment for user: ${userId}`, {
      cartItems,
      points,
      deliveryFee,
      userShippingAddressId,
    });

    try {
      // 1. Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { 
          name: true,
          availablePoints: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      const availablePoints = user?.availablePoints ?? 0;
      
      // 2. Validate points
      if (points && points > 0) {
        if (availablePoints === 0) {
          throw new BadRequestException('Available points is 0');
        }
        if (points > availablePoints) {
          throw new BadRequestException(
            `Insufficient points. Available: ${availablePoints}, Requested: ${points}`,
          );
        }
      }

      // 3. Extract cart item IDs and validate
      const cartItemIds = cartItems.map(item => item.cartItemId);
      
      if (cartItemIds.length === 0) {
        throw new BadRequestException('At least one cart item is required');
      }

      // 4. Fetch cart items with product details
      const fetchedCartItems = await this.prisma.cartItem.findMany({
        where: {
          id: { in: cartItemIds },
          status: 'ACTIVE',
        },
        include: {
          product: {
            select: {
              id: true,
              productName: true,
            },
          },
        },
      });

      if (fetchedCartItems.length === 0) {
        throw new NotFoundException('No active cart items found');
      }

      if (fetchedCartItems.length !== cartItemIds.length) {
        throw new BadRequestException('Some cart items are not available');
      }

      // 5. Calculate original amount (sum of salePrice * quantity)
      const originalAmount = fetchedCartItems.reduce((sum, item) => {
        return sum + item.salePrice * item.quantity;
      }, 0);

      // 6. Process coupons per cart item
      const cartItemCouponMap: Record<string, string[]> = {}; // cartItemId -> couponIds[]
      const cartItemDiscountMap: Record<string, number> = {}; // cartItemId -> discount amount
      let totalCouponDiscount = 0;

      // Build a map of cart items for quick lookup
      const cartItemMap = new Map(
        fetchedCartItems.map(item => [item.id, item])
      );

      // Process each cart item and its coupons
      for (const cartItemInput of cartItems) {
        const cartItem = cartItemMap.get(cartItemInput.cartItemId);
        
        if (!cartItem) {
          continue; // Should not happen due to earlier validation
        }

        const itemAmount = cartItem.salePrice * cartItem.quantity;
        let itemDiscount = 0;
        const itemCouponIds: string[] = [];

        // Process coupons for this cart item
        if (cartItemInput.couponIds && cartItemInput.couponIds.length > 0) {
          // Fetch valid coupons for this cart item
          const coupons = await this.prisma.coupon.findMany({
            where: {
              id: { in: cartItemInput.couponIds },
              isActive: true,
              startDate: { lte: new Date() },
            },
          });

          // Calculate discount for each coupon
          for (const coupon of coupons) {
            let discount = 0;

            if (coupon.type === 'PERCENT') {
              // Percentage discount
              discount = Math.floor((itemAmount * (coupon.discountRate || 0)) / 100);
              
              // Apply max discount limit if set
              if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
              }
            } else if (coupon.type === 'AMOUNT') {
              // Fixed amount discount
              discount = coupon.discountAmount || 0;
            }

            itemDiscount += discount;
            itemCouponIds.push(coupon.id);

            this.logger.log(`Cart item ${cartItem.id}: Applied coupon ${coupon.code} with discount ${discount} KRW`);
          }
        }

        // Store the results
        cartItemCouponMap[cartItem.id] = itemCouponIds;
        cartItemDiscountMap[cartItem.id] = itemDiscount;
        totalCouponDiscount += itemDiscount;

        this.logger.log(`Cart item ${cartItem.id}: Total discount ${itemDiscount} KRW (${itemCouponIds.length} coupons)`);
      }

      // 7. Calculate final amount
      const pointsDiscount = points ? points : 0;
      const totalDiscountAmount = totalCouponDiscount + pointsDiscount;
      const finalAmount = originalAmount - totalDiscountAmount;

      // Ensure final amount is not negative
      if (finalAmount < 0) {
        throw new BadRequestException(
          'Total discount exceeds order amount',
        );
      }

      // 8. Generate unique order group number
      const orderGroupNumber = await this.ordersService.generateUniqueOrderGroupNumber();

      // 9. Generate customerKey for Toss
      const customerKey = `customer_${userId}`;

      // 10. Create order group name
      const productNames = fetchedCartItems
        .slice(0, 2)
        .map(item => item.product?.productName || 'Unknown Product')
        .join(', ');
      const orderGroupName = 
        fetchedCartItems.length > 2
          ? `${productNames} 외 ${fetchedCartItems.length - 2}건`
          : productNames;

      // 11. Create OrderGroup in database
      await this.prisma.orderGroup.create({
        data: {
          orderGroupNumber,
          orderGroupName,
          originalAmount,
          discountAmount: totalDiscountAmount,
          finalAmount,
          cartItemIds,
          pointsUsed: points || 0,
          deliveryFee: deliveryFee || 0,
        },
      });

      // 12. Build response with URLs for Toss
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const successUrl = `${frontendUrl}/payment/success`;
      const failUrl = `${frontendUrl}/payment/fail`;

      this.logger.log('Payment initiated successfully', {
        orderGroupNumber,
        cartItemsCount: cartItems.length,
        originalAmount,
        couponDiscount: totalCouponDiscount,
        pointsDiscount,
        totalDiscountAmount,
        finalAmount,
        deliveryFee,
        userShippingAddressId,
      });

      return {
        orderId: orderGroupNumber,
        originalAmount,
        discountAmount: totalDiscountAmount,
        finalAmount,
        orderGroupName,
        customerKey,
        successUrl,
        failUrl,
        deliveryFee,
        userShippingAddressId,
        cartItemCoupons: cartItems.map(item => ({
          cartItemId: item.cartItemId,
          couponIds: item.couponIds,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to initiate payment', error);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to initiate payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Confirm payment after user completes checkout
   * This is called from the success callback URL
   * Transaction flow: 1. Create orders, 2. Confirm payment with Toss, 3. Save payment
   */
  async confirmPayment(
    dto: ConfirmPaymentRequestDto,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Confirming payment: ${dto.orderGroupNumber}`);

    try {
      // 1. Confirm payment with Toss API FIRST (external call, must be before transaction)
      this.logger.log('Confirming payment with Toss');
      const tossPayment = await this.tossApiService.confirmPayment({
        paymentKey: dto.paymentKey,
        orderId: dto.orderGroupNumber,
        amount: dto.amount,
        deliveryFee: dto.deliveryFee,
      });
      this.logger.log('Payment confirmed with Toss successfully');

      // 2. Execute single database transaction
      const payment = await this.prisma.$transaction(async (tx) => {
        this.logger.log('Starting database transaction');

        // 2.1. Get OrderGroup by orderGroupNumber
        const orderGroup = await tx.orderGroup.findUnique({
          where: { orderGroupNumber: dto.orderGroupNumber },
        });

        if (!orderGroup) {
          throw new NotFoundException(`OrderGroup with number ${dto.orderGroupNumber} not found`);
        }

        this.logger.log(`OrderGroup found with ${orderGroup.cartItemIds.length} cart items`);

        // 2.2. Get User
        const user = await tx.user.findUnique({
          where: { id: dto.userId },
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            availablePoints: true,
          },
        });

        if (!user) {
          throw new NotFoundException(`User with ID ${dto.userId} not found`);
        }

        // 2.2.1. Get User Shipping Address
        let shippingAddress: {
          id: string;
          userId: string;
          recipientName: string;
          deliveryAddress: string;
          address: string;
          addressFull: string;
          postalCode: number;
          mobilePhone: string;
          phoneNumber: string;
          setAsDefault: boolean;
        } | null = null;
        
        if (dto.userShippingAddressId) {
          // Get specific shipping address by ID
          const address = await tx.userShippingAddress.findUnique({
            where: { id: dto.userShippingAddressId },
          });

          if (!address) {
            throw new NotFoundException(`Shipping address with ID ${dto.userShippingAddressId} not found`);
          }

          // Verify that the shipping address belongs to the user
          if (address.userId !== dto.userId) {
            throw new BadRequestException('Shipping address does not belong to this user');
          }
          
          shippingAddress = address;
        } else {
          // Get default shipping address by userId
          shippingAddress = await tx.userShippingAddress.findUnique({
            where: { userId: dto.userId },
          });
        }

        this.logger.log(`Shipping address found: ${shippingAddress ? 'Yes' : 'No (will use user info as fallback)'}`);

        // 2.3. Get Cart
        const cart = await tx.cart.findUnique({
          where: { userId: dto.userId },
        });

        if (!cart) {
          throw new NotFoundException(`Cart for user ${dto.userId} not found`);
        }

        // 2.4. Get Cart Items using cartItemIds from OrderGroup
        const cartItems = await tx.cartItem.findMany({
          where: {
            id: { in: orderGroup.cartItemIds },
            status: 'ACTIVE',
          },
          include: {
            product: {
              select: {
                id: true,
                productName: true,
              },
            },
          },
        });

        if (cartItems.length === 0) {
          throw new NotFoundException('No active cart items found');
        }

        this.logger.log(`Found ${cartItems.length} cart items`);

        // 2.5. Get user's active membership
        const userMembership = await tx.userMembership.findFirst({
          where: {
            userId: dto.userId,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        });

        const membershipLevelAtOrderTime = userMembership?.membershipName || '';

        // 2.6. Build cart item -> coupon mapping
        const today = this.formatLocalYyyyMmDd(new Date());
        const cartItemCouponMap: Map<string, string[]> = new Map(); // cartItemId -> couponIds
        const allCouponIds = new Set<string>();

        // Process cart item coupons from DTO
        if (dto.cartItemCoupons && dto.cartItemCoupons.length > 0) {
          for (const item of dto.cartItemCoupons) {
            if (item.couponIds && item.couponIds.length > 0) {
              cartItemCouponMap.set(item.cartItemId, item.couponIds);
              item.couponIds.forEach(id => allCouponIds.add(id));
            }
          }
        }

        // Fetch all unique coupons
        let couponMap: Map<string, Coupon> = new Map();
        
        if (allCouponIds.size > 0) {
          this.logger.log(`Fetching ${allCouponIds.size} unique coupons from database`);
          
          const coupons = await tx.coupon.findMany({
            where: {
              id: { in: Array.from(allCouponIds) },
            },
          });

          couponMap = new Map(coupons.map(c => [c.id, c]));
          this.logger.log(`Found ${coupons.length} valid coupons`);
        }

        // 2.7. Calculate discount for each cart item and create orders
        interface CreatedOrder {
          id: string;
          orderNumber: string;
          totalOrderAmount: number;
          totalPaymentAmount: number;
          appliedDiscount: number;
          appliedCouponIds: string[];
        }

        const createdOrders: CreatedOrder[] = [];

        for (const cartItem of cartItems) {
          const orderNumber = await this.ordersService.generateUniqueOrderNumber(
            dto.orderGroupNumber,
          );
          const totalOrderAmount = cartItem.salePrice * cartItem.quantity;
          let totalDiscount = 0;
          const appliedCouponIds: string[] = [];

          // Get coupons for this specific cart item
          const cartItemCouponIds = cartItemCouponMap.get(cartItem.id) || [];

          // Calculate total discount from coupons for this cart item
          for (const couponId of cartItemCouponIds) {
            const coupon = couponMap.get(couponId);
            
            if (!coupon) {
              this.logger.warn(`Coupon ${couponId} not found, skipping`);
              continue;
            }

            let discountAmount = 0;

            // Calculate discount based on coupon type
            if (coupon.type === 'PERCENT') {
              // Apply percentage discount
              const discountRate = coupon.discountRate || 0;
              discountAmount = Math.floor((totalOrderAmount * discountRate) / 100);

              // Apply max discount limit if specified
              if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
              }
            } else if (coupon.type === 'AMOUNT') {
              // Apply fixed amount discount
              discountAmount = coupon.discountAmount || 0;
            }

            totalDiscount += discountAmount;
            appliedCouponIds.push(coupon.id);
            this.logger.log(`Coupon ${coupon.code} discount for cart item ${cartItem.id}: -${discountAmount} KRW`);
          }

          // Calculate final payment amount with discount
          const totalPaymentAmount = Math.max(0, totalOrderAmount - totalDiscount);

          // Create order with discounted amount
          const orderData: Prisma.OrderCreateInput = {
            orderNumber,
            orderGroup: {
              connect: { orderGroupNumber: dto.orderGroupNumber },
            },
            totalOrderAmount,
            totalPaymentAmount,
            productName: cartItem.product?.productName || '',
            productNameWithOptions: cartItem.product?.productName || '',
            quantity: cartItem.quantity,
            salePrice: cartItem.salePrice,
            couponUsed: appliedCouponIds, // Store applied coupon IDs for this order
            discountAmount: totalDiscount,
            // Use shipping address if available, otherwise fallback to user info
            recipient: shippingAddress?.recipientName || user.name || '',
            recipientAddressFull: shippingAddress?.addressFull || '',
            recipientPostalCode: shippingAddress?.postalCode || 0,
            recipientMobilePhone: shippingAddress?.mobilePhone || user.phoneNumber || '',
            recipientPhoneNumber: shippingAddress?.phoneNumber || '',
            deliveryMessage: '',
            situation: EOrderSituation.ORDER_PAYMENT_COMPLETED,
            orderDate: today,
            ordererName: user.name || '',
            ordererMobilePhone: user.phoneNumber || '',
            membershipLevelAtOrderTime,
            cart: {
              connect: { id: cart.id },
            },
            product: {
              connect: { id: cartItem.productId },
            },
            user: {
              connect: { id: dto.userId },
            },
          };

          const order = await tx.order.create({
            data: orderData,
          });

          createdOrders.push({ 
            id: order.id,
            orderNumber: order.orderNumber || orderNumber,
            totalOrderAmount: order.totalOrderAmount || totalOrderAmount,
            totalPaymentAmount: order.totalPaymentAmount || totalPaymentAmount,
            appliedDiscount: totalDiscount,
            appliedCouponIds,
          });

          this.logger.log(`Created order ${orderNumber}: ${totalOrderAmount} KRW -> ${totalPaymentAmount} KRW (discount: ${totalDiscount}, coupons: ${appliedCouponIds.length})`);
        }

        this.logger.log(`Created ${createdOrders.length} orders`);

        // 2.8. Save coupon history for each coupon and order
        if (allCouponIds.size > 0) {
          this.logger.log('Saving coupon history');

          for (const order of createdOrders) {
            // Only process coupons that were actually applied to this order
            for (const couponId of order.appliedCouponIds) {
              const coupon = couponMap.get(couponId);
              
              if (!coupon) {
                continue;
              }

              // Calculate discount amount for this order
              let discountAmount = 0;

              if (coupon.type === 'PERCENT') {
                const discountRate = coupon.discountRate || 0;
                discountAmount = Math.floor((order.totalOrderAmount * discountRate) / 100);

                if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                  discountAmount = coupon.maxDiscountAmount;
                }
              } else if (coupon.type === 'AMOUNT') {
                discountAmount = coupon.discountAmount || 0;
              }

              // Check if coupon history already exists
              const existingHistory = await tx.couponHistory.findFirst({
                where: {
                  couponId: coupon.id,
                  userId: dto.userId,
                  status: 'ISSUED',
                },
              });

              if (existingHistory) {
                // Update existing history to USED
                await tx.couponHistory.update({
                  where: { id: existingHistory.id },
                  data: {
                    status: 'USED',
                    usedAt: new Date(),
                    orderId: order.id,
                    discountAppliedAmount: discountAmount,
                    purchaseAmountAtUse: order.totalOrderAmount,
                  },
                });
              } else {
                // Create new coupon history as USED
                await tx.couponHistory.create({
                  data: {
                    couponId: coupon.id,
                    userId: dto.userId,
                    orderId: order.id,
                    status: 'USED',
                    issuedAt: new Date(),
                    usedAt: new Date(),
                    discountAppliedAmount: discountAmount,
                    purchaseAmountAtUse: order.totalOrderAmount,
                  },
                });
              }

              this.logger.log(`Saved coupon history for ${coupon.code} on order ${order.orderNumber}`);
            }
          }
        }

        // 2.9. Apply points if pointsUsed > 0
        if (orderGroup.pointsUsed > 0) {
          this.logger.log(`Applying ${orderGroup.pointsUsed} points`);

          // Create point record
          await tx.point.create({
            data: {
              date: today,
              userId: dto.userId,
              orderGroupNumber: dto.orderGroupNumber,
              pointsType: 'USED',
              availablePointsDeduction: orderGroup.pointsUsed,
              availablePointsBalance: (user?.availablePoints || 0) - orderGroup.pointsUsed,
              content: `Points used for order ${dto.orderGroupNumber}`,
            },
          });

          // Update user's available points
          await tx.user.update({
            where: { id: dto.userId },
            data: {
              availablePoints: { decrement: orderGroup.pointsUsed },
              totalUsedPoints: { increment: orderGroup.pointsUsed },
            },
          });

          this.logger.log(`${orderGroup.pointsUsed} points deducted from user`);
        }

        // 2.10. Update user's total purchase amount
        await tx.user.update({
          where: { id: dto.userId },
          data: {
            totalPurchaseAmount: { increment: orderGroup.finalAmount },
          },
        });

        // 2.11. Save payment to database
        this.logger.log('Saving payment to database');
        const savedPayment = await tx.payment.create({
          data: {
            userId: dto.userId,
            orderGroupNumber: tossPayment.orderId,
            paymentKey: tossPayment.paymentKey,
            transactionKey: tossPayment.transactionKey,
            mId: tossPayment.mId,
            totalAmount: tossPayment.totalAmount,
            balanceAmount: tossPayment.balanceAmount,
            suppliedAmount: tossPayment.suppliedAmount,
            vat: tossPayment.vat,
            taxFreeAmount: tossPayment.taxFreeAmount,
            taxExemptionAmount: tossPayment.taxExemptionAmount,
            deliveryFee: tossPayment.deliveryFee,
            status: this.mapTossStatusToPaymentStatus(tossPayment.status),
            type: this.mapTossTypeToPaymentType(tossPayment.type),
            method: tossPayment.method,
            currency: tossPayment.currency,
            orderName: tossPayment.orderName,
            requestedAt: new Date(tossPayment.requestedAt),
            approvedAt: tossPayment.approvedAt
              ? new Date(tossPayment.approvedAt)
              : undefined,
            receiptUrl: tossPayment.receipt?.url,
            cardInfo: tossPayment.card as any,
            virtualAccountInfo: tossPayment.virtualAccount as any,
            easyPayInfo: tossPayment.easyPay as any,
            transferInfo: tossPayment.transfer,
            mobilePhoneInfo: tossPayment.mobilePhone,
            giftCertificateInfo: tossPayment.giftCertificate,
            cancels: tossPayment.cancels as any,
            secret: tossPayment.secret,
            metadata: tossPayment.metadata,
          },
        });

        // 2.12. Delete cart items from cart
        this.logger.log('Deleting cart items');
        await tx.cartItem.deleteMany({
          where: {
            id: { in: orderGroup.cartItemIds },
          },
        });

        this.logger.log(`Deleted ${orderGroup.cartItemIds.length} cart items`);
        this.logger.log('Transaction completed successfully');

        return savedPayment;
      });

      this.logger.log(`Payment confirmation completed successfully: ${payment.id}`);

      return this.mapToResponseDto(payment);
    } catch (error) {
      this.logger.error('Failed to confirm payment', error);

      // Try to save failed payment record
      try {
        await this.paymentRepository.create({
          userId: dto.userId,
          orderGroupNumber: dto.orderGroupNumber,
          paymentKey: dto.paymentKey,
          totalAmount: dto.amount,
          balanceAmount: 0,
          status: PaymentStatus.FAILED,
          type: PaymentType.NORMAL,
          currency: 'KRW',
          orderName: '',
          requestedAt: new Date(),
          failureCode: error.response?.data?.code || 'UNKNOWN',
          failureMessage: error.response?.data?.message || error.message,
        });
      } catch (saveError) {
        this.logger.error('Failed to save failed payment record', saveError);
      }

      throw error;
    }
  }

  private formatLocalYyyyMmDd(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Get payment by payment key
   */
  async getPaymentByKey(paymentKey: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findByPaymentKey(paymentKey);

    if (!payment) {
      throw new NotFoundException(
        `Payment with key ${paymentKey} not found`,
      );
    }

    return this.mapToResponseDto(payment);
  }

  /**
   * Get payment by order group number
   */
  async getPaymentByOrderId(orderGroupNumber: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findByOrderGroupNumber(orderGroupNumber);

    if (!payment) {
      throw new NotFoundException(
        `Payment with order group number ${orderGroupNumber} not found`,
      );
    }

    return this.mapToResponseDto(payment);
  }

  /**
   * Get payments with filters and pagination
   */
  async getPayments(query: GetPaymentDto): Promise<PaymentListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const filter: { userId?: string; status?: PaymentStatus } = {};
    if (query.userId) filter.userId = query.userId;
    if (query.status) filter.status = query.status;

    const { data, total } = await this.paymentRepository.findMany(
      filter,
      page,
      limit,
    );

    return {
      data: data.map((p) => this.mapToResponseDto(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cancel payment (full or partial)
   */
  async cancelPayment(
    dto: CancelPaymentRequestDto,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Canceling payment: ${dto.paymentId}`);

    try {
      // Get payment from database
      const payment = await this.paymentRepository.findById(dto.paymentId);

      if (!payment) {
        throw new NotFoundException(
          `Payment with ID ${dto.paymentId} not found`,
        );
      }

      // Check if payment can be canceled
      if (payment.status !== PaymentStatus.SUCCESS) {
        throw new BadRequestException(
          'Only successful payments can be canceled',
        );
      }

      if (payment.balanceAmount <= 0) {
        throw new BadRequestException('No balance available to cancel');
      }

      // Call Toss API to cancel
      const tossPayment = await this.tossApiService.cancelPayment(
        payment.paymentKey,
        {
          cancelReason: dto.cancelReason,
          cancelAmount: dto.cancelAmount,
        },
      );

      // Update payment in database
      const updatedPayment = await this.paymentRepository.update(payment.id, {
        status:
          tossPayment.balanceAmount === 0
            ? PaymentStatus.CANCELLED
            : PaymentStatus.SUCCESS,
        balanceAmount: tossPayment.balanceAmount,
        cancels: tossPayment.cancels,
        canceledAmount:
          payment.totalAmount - tossPayment.balanceAmount,
      });

      this.logger.log(`Payment canceled successfully: ${payment.id}`);

      return this.mapToResponseDto(updatedPayment);
    } catch (error) {
      this.logger.error('Failed to cancel payment', error);
      throw error;
    }
  }

  /**
   * Handle webhook from Toss
   * This is called when payment status changes (e.g., virtual account deposit)
   */
  handleWebhook(eventType: string, data: any): void {
    this.logger.log(`Handling webhook: ${eventType}`);

    try {
      switch (eventType) {
        case 'PAYMENT_STATUS_CHANGED':
          this.handlePaymentStatusChanged(data);
          break;
        case 'VIRTUAL_ACCOUNT_DEPOSIT':
          this.handleVirtualAccountDeposit(data);
          break;
        default:
          this.logger.warn(`Unknown webhook event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle webhook', error);
      throw error;
    }
  }

  /**
   * Sync payment with Toss (get latest status)
   */
  async syncPayment(paymentKey: string): Promise<PaymentResponseDto> {
    this.logger.log(`Syncing payment: ${paymentKey}`);

    try {
      // Get latest payment info from Toss
      const tossPayment = await this.tossApiService.getPayment(paymentKey);

      // Update in database
      const payment = await this.paymentRepository.findByPaymentKey(paymentKey);

      if (!payment) {
        // Create new payment record if not exists
        const newPayment = await this.savePaymentFromToss(tossPayment);
        return this.mapToResponseDto(newPayment);
      }

      // Update existing payment
      const updatedPayment = await this.paymentRepository.update(payment.id, {
        status: this.mapTossStatusToPaymentStatus(tossPayment.status),
        approvedAt: tossPayment.approvedAt
          ? new Date(tossPayment.approvedAt)
          : undefined,
        balanceAmount: tossPayment.balanceAmount,
        receiptUrl: tossPayment.receipt?.url,
        cancels: tossPayment.cancels,
        cardInfo: tossPayment.card,
        virtualAccountInfo: tossPayment.virtualAccount,
      });

      return this.mapToResponseDto(updatedPayment);
    } catch (error) {
      this.logger.error('Failed to sync payment', error);
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.paymentRepository.getPaymentStats(userId, startDate, endDate);
  }

  // Private helper methods

  private generateOrderId(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `order_${timestamp}_${random}`;
  }

  private async savePaymentFromToss(
    tossPayment: TossPaymentResponse,
  ): Promise<any> {
    return this.paymentRepository.create({
      userId: tossPayment.metadata?.userId || '', // Should be passed in metadata
      subscriptionId: tossPayment.metadata?.subscriptionId,
      orderGroupNumber: tossPayment.orderId, // Toss's orderId is our orderGroupNumber
      paymentKey: tossPayment.paymentKey,
      transactionKey: tossPayment.transactionKey,
      mId: tossPayment.mId,
      totalAmount: tossPayment.totalAmount,
      balanceAmount: tossPayment.balanceAmount,
      suppliedAmount: tossPayment.suppliedAmount,
      vat: tossPayment.vat,
      taxFreeAmount: tossPayment.taxFreeAmount,
      taxExemptionAmount: tossPayment.taxExemptionAmount,
      status: this.mapTossStatusToPaymentStatus(tossPayment.status),
      type: this.mapTossTypeToPaymentType(tossPayment.type),
      method: tossPayment.method,
      currency: tossPayment.currency,
      orderName: tossPayment.orderName,
      requestedAt: new Date(tossPayment.requestedAt),
      approvedAt: tossPayment.approvedAt
        ? new Date(tossPayment.approvedAt)
        : undefined,
      receiptUrl: tossPayment.receipt?.url,
      cardInfo: tossPayment.card,
      virtualAccountInfo: tossPayment.virtualAccount,
      easyPayInfo: tossPayment.easyPay,
      transferInfo: tossPayment.transfer,
      mobilePhoneInfo: tossPayment.mobilePhone,
      giftCertificateInfo: tossPayment.giftCertificate,
      cancels: tossPayment.cancels,
      secret: tossPayment.secret,
      metadata: tossPayment.metadata,
    });
  }

  private mapTossStatusToPaymentStatus(tossStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      READY: PaymentStatus.PENDING,
      IN_PROGRESS: PaymentStatus.PENDING,
      WAITING_FOR_DEPOSIT: PaymentStatus.PENDING,
      DONE: PaymentStatus.SUCCESS,
      CANCELED: PaymentStatus.CANCELLED,
      PARTIAL_CANCELED: PaymentStatus.SUCCESS,
      ABORTED: PaymentStatus.FAILED,
      EXPIRED: PaymentStatus.FAILED,
    };

    return statusMap[tossStatus] || PaymentStatus.PENDING;
  }

  private mapTossTypeToPaymentType(tossType: string): PaymentType {
    const typeMap: Record<string, PaymentType> = {
      NORMAL: PaymentType.NORMAL,
      BILLING: PaymentType.BILLING,
      BRANDPAY: PaymentType.BRANDPAY,
    };

    return typeMap[tossType] || PaymentType.NORMAL;
  }

  private mapToResponseDto(payment: any): PaymentResponseDto {
    return {
      id: payment.id,
      userId: payment.userId,
      orderId: payment.orderGroupNumber, // Map orderGroupNumber to orderId for API response
      paymentKey: payment.paymentKey,
      orderName: payment.orderName,
      totalAmount: payment.totalAmount,
      balanceAmount: payment.balanceAmount,
      status: payment.status,
      type: payment.type,
      method: payment.method || '',
      currency: payment.currency,
      requestedAt: payment.requestedAt,
      approvedAt: payment.approvedAt,
      receiptUrl: payment.receiptUrl,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private handlePaymentStatusChanged(data: any): void {
    // Implement payment status change logic
    this.logger.log('Handling payment status change', data);
  }

  private handleVirtualAccountDeposit(data: any): void {
    // Implement virtual account deposit logic
    this.logger.log('Handling virtual account deposit', data);
  }
}
