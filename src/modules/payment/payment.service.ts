import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, PaymentType, Prisma, Coupon, OrderSituation } from '@prisma/client';
import { TossPaymentApiService } from './services/toss-payment-api.service';
import { PaymentRepository } from './repositories/payment.repository';
import {
  CreatePaymentDto,
  ConfirmPaymentRequestDto,
  CancelPaymentRequestDto,
  GetPaymentDto,
  CouponIdQuantityDto,
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
import { CouponHistoryService } from '../coupon-history/coupon-history.service';
import { PointService } from '../point/point.service';
import { JwtService } from '@nestjs/jwt';
import { config } from '../../libs/config';
import { CartItemService } from '../carts/services/cart-item.service';

export interface PaymentTokenPayload {
  orderGroupNumber: string;
  userId: string;
  directPay?: boolean;
  iat?: number;
  exp?: number;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly tossApiService: TossPaymentApiService,
    private readonly paymentRepository: PaymentRepository,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
    private readonly couponHistoryService: CouponHistoryService,
    private readonly pointService: PointService,
    private readonly jwtService: JwtService,
    private readonly cartItemService: CartItemService,
  ) {}

  /**
   * Initiate payment - Create order ID and return payment info
   * Client will use this to open Toss checkout page
   */
  async initiatePayment(
    userId: string,
    cartItemIds: string[],
    couponIds?: CouponIdQuantityDto[],
    userShippingAddressId?: string,
    points?: number,
    deliveryFee?: number,
  ): Promise<InitiatePaymentResponseDto> {
    if (!userShippingAddressId) {
      throw new BadRequestException('User shipping address ID is required');
    }

    try {
      // 1. Validate user exists (need name, phoneNumber for order creation)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          availablePoints: true,
          phoneNumber: true,
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

      // 3. Validate cart item IDs
      if (!cartItemIds || cartItemIds.length === 0) {
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
              origin: true,
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

      // Check if product origin >= cart item quantity
      for (const item of fetchedCartItems) {
        const origin = item.product?.origin;
        if (origin != null && origin < item.quantity) {
          throw new BadRequestException(
            `Not enough quantity for "${item.product?.productName ?? 'Product'}". Available: ${origin}, Requested: ${item.quantity}`,
          );
        }
      }

      // 5. Calculate original amount (sum of salePrice * quantity)
      const originalAmount = fetchedCartItems.reduce((sum, item) => {
        return sum + item.salePrice * item.quantity;
      }, 0);

      // 6. Process order-level coupons (from couponIds DTO)
      let totalCouponDiscount = 0;
      const appliedCouponIds: string[] = [];
      let effectiveDeliveryFee = deliveryFee ?? 0;

      let coupons: Coupon[] = [];
      if (couponIds && couponIds.length > 0) {
        const couponIdsFromDto = couponIds.map((c) => c.couponId);
        coupons = await this.prisma.coupon.findMany({
          where: {
            id: { in: couponIdsFromDto },
            isActive: true,
          },
        });

        for (const coupon of coupons) {
          const dtoEntry = couponIds.find((c) => c.couponId === coupon.id);
          const quantity = dtoEntry?.quantity ?? 1;

          let discount = 0;

          if (coupon.type === 'PERCENT') {
            discount = Math.floor((originalAmount * (coupon.discountRate || 0)) / 100);
            if (coupon.maxDiscountAmount != null && discount > coupon.maxDiscountAmount) {
              discount = coupon.maxDiscountAmount;
            }
          } else if (coupon.type === 'AMOUNT') {
            discount = (coupon.discountAmount || 0) * quantity;
          } else if (coupon.type === 'FREE_SHIPPING') {
            effectiveDeliveryFee = 0;
            discount = 0;
          }

          totalCouponDiscount += discount;
          appliedCouponIds.push(coupon.id);
          this.logger.log(`Applied order-level coupon ${coupon.code} with discount ${discount} KRW`);
        }
      }

      // 7. Calculate final amount
      const pointsDiscount = points ? points : 0;
      const totalDiscountAmount = totalCouponDiscount + pointsDiscount;
      const finalAmount = originalAmount - totalDiscountAmount + effectiveDeliveryFee;

      // Ensure final amount is not negative
      if (finalAmount < 0) {
        throw new BadRequestException(
          'Total discount exceeds order amount',
        );
      }

      // Validate minimum payment amount for Toss Payment API
      // Credit card: minimum 100원, Bank account: minimum 200원
      // We validate with 200원 to support all payment methods
      const MINIMUM_PAYMENT_AMOUNT = 200;
      if (finalAmount < MINIMUM_PAYMENT_AMOUNT) {
        throw new BadRequestException(
          `Payment amount must be at least ${MINIMUM_PAYMENT_AMOUNT}원. Current amount: ${finalAmount}원`,
        );
      }

      // 8. Generate unique order group number
      const orderGroupNumber = await this.ordersService.generateUniqueOrderGroupNumber();

      // 9. Fetch cart, shipping address, membership for order creation
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
      });
      if (!cart) {
        throw new NotFoundException(`Cart for user ${userId} not found`);
      }

      let shippingAddress: {
        recipientName: string;
        addressFull: string;
        postalCode: number | null;
        mobilePhone: string | null;
        phoneNumber: string | null;
      } | null = null;
      if (userShippingAddressId) {
        const address = await this.prisma.userShippingAddress.findUnique({
          where: { id: userShippingAddressId },
        });
        if (!address) {
          throw new NotFoundException(`Shipping address with ID ${userShippingAddressId} not found`);
        }
        if (address.userId !== userId) {
          throw new BadRequestException('Shipping address does not belong to this user');
        }
        shippingAddress = address;
      }

      const userMembership = await this.prisma.userMembership.findFirst({
        where: {
          userId,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      const membershipLevelAtOrderTime = userMembership?.membershipName || '';
      const couponMap = new Map(coupons.map((c) => [c.id, c]));
      const today = this.formatLocalYyyyMmDd(new Date());

      // 10. Create OrderGroup and Orders in a single transaction
      await this.prisma.$transaction(
        async (tx) => {
          await tx.orderGroup.create({
            data: {
              orderGroupNumber,
              situation: EOrderSituation.ORDER_PAYMENT_PENDING as OrderSituation,
              orderGroupName: 'Order Group Number: ' + orderGroupNumber,
              originalAmount,
              discountAmount: totalDiscountAmount,
              finalAmount,
              cartItemIds,
              pointsUsed: points || 0,
              deliveryFee: effectiveDeliveryFee,
              ordererId: userId,
            },
          });

          for (const cartItem of fetchedCartItems) {
            const totalOrderAmount = cartItem.salePrice * cartItem.quantity;
            let totalDiscount = 0;
            const orderAppliedCouponIds: string[] = [];

            if (couponIds && couponIds.length > 0) {
              for (const entry of couponIds) {
                const coupon = couponMap.get(entry.couponId);
                if (!coupon) continue;

                let discount = 0;
                if (coupon.type === 'PERCENT') {
                  discount = Math.floor(
                    (totalOrderAmount * (coupon.discountRate || 0)) / 100,
                  );
                  if (
                    coupon.maxDiscountAmount != null &&
                    discount > coupon.maxDiscountAmount
                  ) {
                    discount = coupon.maxDiscountAmount;
                  }
                } else if (coupon.type === 'AMOUNT') {
                  discount = (coupon.discountAmount || 0) * (entry.quantity ?? 1);
                }
                totalDiscount += discount;
                orderAppliedCouponIds.push(coupon.id);
              }
            }

            const totalPaymentAmount = Math.max(0, totalOrderAmount - totalDiscount);

            let orderNumber = '';
            const maxRetries = 5;
            let retryCount = 0;
            let orderCreated = false;

            while (!orderCreated && retryCount < maxRetries) {
              try {
                orderNumber = await this.ordersService.generateOrderNumberInTransaction(
                  tx,
                  orderGroupNumber,
                );

                const orderData: Prisma.OrderCreateInput = {
                  orderNumber,
                  orderGroup: {
                    connect: { orderGroupNumber },
                  },
                  totalOrderAmount,
                  totalPaymentAmount,
                  productName: cartItem.product?.productName || '',
                  productNameWithOptions: cartItem.product?.productName || '',
                  quantity: cartItem.quantity,
                  salePrice: cartItem.salePrice,
                  couponUsed: orderAppliedCouponIds,
                  discountAmount: totalDiscount,
                  recipient: shippingAddress?.recipientName || user.name || '',
                  recipientAddressFull: shippingAddress?.addressFull || '',
                  recipientPostalCode: shippingAddress?.postalCode || 0,
                  recipientMobilePhone: shippingAddress?.mobilePhone || user.phoneNumber || '',
                  recipientPhoneNumber: shippingAddress?.phoneNumber || '',
                  deliveryMessage: '',
                  orderDate: today,
                  ordererName: user.name || '',
                  ordererMobilePhone: user.phoneNumber || '',
                  membershipLevelAtOrderTime,
                  cart: { connect: { id: cart.id } },
                  product: { connect: { id: cartItem.productId } },
                };

                await tx.order.create({ data: orderData });

                this.logger.log(
                  `Created order ${orderNumber}: ${totalOrderAmount} KRW -> ${totalPaymentAmount} KRW (discount: ${totalDiscount})`,
                );
                orderCreated = true;
              } catch (error: any) {
                if (error?.code === 'P2002' && error?.meta?.target?.includes('order_number')) {
                  retryCount++;
                  this.logger.warn(
                    `Duplicate order number ${orderNumber}, retrying (${retryCount}/${maxRetries})`,
                  );
                  await new Promise((resolve) => setTimeout(resolve, 50 * retryCount));
                  continue;
                }
                throw error;
              }
            }

            if (!orderCreated) {
              throw new InternalServerErrorException(
                `Failed to create order for cart item ${cartItem.id} after ${maxRetries} attempts`,
              );
            }
          }

          this.logger.log(`Created ${fetchedCartItems.length} orders for order group ${orderGroupNumber}`);
        },
        { timeout: 30_000, maxWait: 10_000 },
      );

      // 11. Generate customerKey for Toss
      const customerKey = `customer_${userId}`;

      // 12. Build response with URLs for Toss (orders already created and linked to OrderGroup)
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const successUrl = `${frontendUrl}/payment/success`;
      const failUrl = `${frontendUrl}/payment/fail`;

      this.logger.log('Payment initiated successfully', {
        orderGroupNumber,
        cartItemsCount: cartItemIds.length,
        originalAmount,
        couponDiscount: totalCouponDiscount,
        pointsDiscount,
        totalDiscountAmount,
        finalAmount,
        deliveryFee: effectiveDeliveryFee,
        userShippingAddressId,
      });

      const paymentToken = await this.jwtService.signAsync(
        { orderGroupNumber, userId, directPay: false } as PaymentTokenPayload,
        {
          secret: config.JWT_SECRET_ACCESS_TOKEN,
          expiresIn: '1h',
        },
      );

      return {
        orderId: orderGroupNumber,
        originalAmount,
        discountAmount: totalDiscountAmount,
        finalAmount,
        orderGroupName: 'Order Group Number: ' + orderGroupNumber,
        customerKey,
        successUrl,
        failUrl,
        deliveryFee: effectiveDeliveryFee,
        userShippingAddressId,
        cartItems: cartItemIds,
        coupons: appliedCouponIds.map((id) => ({
          couponId: id,
          quantity: 1,
        })),
        paymentToken,
        directPay: false,
      };
    } catch (error) {
      this.logger.error('Failed to initiate payment', error);

      if (cartItemIds?.length) {
        for (const cartItemId of cartItemIds) {
          try {
            await this.cartItemService.removeItem(String(cartItemId));
          } catch (deleteError) {
            this.logger.warn(
              `Failed to remove cart item ${cartItemId} after initiate error.`,
              deleteError,
            );
          }
        }
      }

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
   * Initiate payment V2 - Same logic as initiatePayment but uses productIds instead of cart items.
   * No cart involvement: fetches products by ID, creates OrderGroup and Orders without cart.
   */
  async initiatePaymentV2(
    userId: string,
    productIds: string[],
    couponIds?: CouponIdQuantityDto[],
    userShippingAddressId?: string,
    points?: number,
    deliveryFee?: number,
  ): Promise<InitiatePaymentResponseDto> {
    if (!userShippingAddressId) {
      throw new BadRequestException('User shipping address ID is required');
    }

    try {
      // 1. Validate user exists (need name, phoneNumber for order creation)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          availablePoints: true,
          phoneNumber: true,
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

      // 3. Validate product IDs (group by id to get quantity per product)
      if (!productIds || productIds.length === 0) {
        throw new BadRequestException('At least one product is required');
      }

      const productIdToQuantity = new Map<string, number>();
      for (const id of productIds) {
        productIdToQuantity.set(id, (productIdToQuantity.get(id) ?? 0) + 1);
      }
      const uniqueProductIds = Array.from(productIdToQuantity.keys());

      // 4. Fetch products by IDs
      const products = await this.prisma.product.findMany({
        where: { id: { in: uniqueProductIds } },
        select: {
          id: true,
          productName: true,
          origin: true,
          salePrice: true,
        },
      });

      if (products.length === 0) {
        throw new NotFoundException('No products found');
      }

      if (products.length !== uniqueProductIds.length) {
        throw new BadRequestException('Some products are not found');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));
      const orderItems: { product: (typeof products)[0]; quantity: number }[] = [];
      for (const pid of uniqueProductIds) {
        const product = productMap.get(pid);
        const quantity = productIdToQuantity.get(pid)!;
        if (!product) continue;
        const origin = product.origin ?? 0;
        if (origin < quantity) {
          throw new BadRequestException(
            `Not enough quantity for "${product.productName ?? 'Product'}". Available: ${origin}, Requested: ${quantity}`,
          );
        }
        const salePrice = product.salePrice ?? 0;
        if (salePrice <= 0) {
          throw new BadRequestException(
            `Product "${product.productName ?? pid}" has invalid sale price`,
          );
        }
        orderItems.push({ product, quantity });
      }

      // 5. Calculate original amount (sum of salePrice * quantity)
      const originalAmount = orderItems.reduce((sum, { product, quantity }) => {
        return sum + (product.salePrice ?? 0) * quantity;
      }, 0);

      // 6. Process order-level coupons (from couponIds DTO)
      let totalCouponDiscount = 0;
      const appliedCouponIds: string[] = [];
      let effectiveDeliveryFee = deliveryFee ?? 0;

      let coupons: Coupon[] = [];
      if (couponIds && couponIds.length > 0) {
        const couponIdsFromDto = couponIds.map((c) => c.couponId);
        coupons = await this.prisma.coupon.findMany({
          where: {
            id: { in: couponIdsFromDto },
            isActive: true,
          },
        });

        for (const coupon of coupons) {
          const dtoEntry = couponIds.find((c) => c.couponId === coupon.id);
          const quantity = dtoEntry?.quantity ?? 1;

          let discount = 0;

          if (coupon.type === 'PERCENT') {
            discount = Math.floor((originalAmount * (coupon.discountRate || 0)) / 100);
            if (coupon.maxDiscountAmount != null && discount > coupon.maxDiscountAmount) {
              discount = coupon.maxDiscountAmount;
            }
          } else if (coupon.type === 'AMOUNT') {
            discount = (coupon.discountAmount || 0) * quantity;
          } else if (coupon.type === 'FREE_SHIPPING') {
            effectiveDeliveryFee = 0;
            discount = 0;
          }

          totalCouponDiscount += discount;
          appliedCouponIds.push(coupon.id);
          this.logger.log(`Applied order-level coupon ${coupon.code} with discount ${discount} KRW`);
        }
      }

      // 7. Calculate final amount
      const pointsDiscount = points ? points : 0;
      const totalDiscountAmount = totalCouponDiscount + pointsDiscount;
      const finalAmount = originalAmount - totalDiscountAmount + effectiveDeliveryFee;

      if (finalAmount < 0) {
        throw new BadRequestException('Total discount exceeds order amount');
      }

      const MINIMUM_PAYMENT_AMOUNT = 200;
      if (finalAmount < MINIMUM_PAYMENT_AMOUNT) {
        throw new BadRequestException(
          `Payment amount must be at least ${MINIMUM_PAYMENT_AMOUNT}원. Current amount: ${finalAmount}원`,
        );
      }

      // 8. Generate unique order group number
      const orderGroupNumber = await this.ordersService.generateUniqueOrderGroupNumber();

      // 9. Fetch shipping address and membership (no cart)
      let shippingAddress: {
        recipientName: string;
        addressFull: string;
        postalCode: number | null;
        mobilePhone: string | null;
        phoneNumber: string | null;
      } | null = null;
      if (userShippingAddressId) {
        const address = await this.prisma.userShippingAddress.findUnique({
          where: { id: userShippingAddressId },
        });
        if (!address) {
          throw new NotFoundException(`Shipping address with ID ${userShippingAddressId} not found`);
        }
        if (address.userId !== userId) {
          throw new BadRequestException('Shipping address does not belong to this user');
        }
        shippingAddress = address;
      }

      const userMembership = await this.prisma.userMembership.findFirst({
        where: {
          userId,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      const membershipLevelAtOrderTime = userMembership?.membershipName || '';
      const couponMap = new Map(coupons.map((c) => [c.id, c]));
      const today = this.formatLocalYyyyMmDd(new Date());

      // 10. Create OrderGroup and Orders in a single transaction (no cart)
      await this.prisma.$transaction(
        async (tx) => {
          await tx.orderGroup.create({
            data: {
              orderGroupNumber,
              situation: EOrderSituation.ORDER_PAYMENT_PENDING as OrderSituation,
              orderGroupName: 'Order Group Number: ' + orderGroupNumber,
              originalAmount,
              discountAmount: totalDiscountAmount,
              finalAmount,
              cartItemIds: productIds,
              pointsUsed: points || 0,
              deliveryFee: effectiveDeliveryFee,
              ordererId: userId,
            },
          });

          for (const { product, quantity } of orderItems) {
            const salePrice = product.salePrice ?? 0;
            const totalOrderAmount = salePrice * quantity;
            let totalDiscount = 0;
            const orderAppliedCouponIds: string[] = [];

            if (couponIds && couponIds.length > 0) {
              for (const entry of couponIds) {
                const coupon = couponMap.get(entry.couponId);
                if (!coupon) continue;

                let discount = 0;
                if (coupon.type === 'PERCENT') {
                  discount = Math.floor(
                    (totalOrderAmount * (coupon.discountRate || 0)) / 100,
                  );
                  if (
                    coupon.maxDiscountAmount != null &&
                    discount > coupon.maxDiscountAmount
                  ) {
                    discount = coupon.maxDiscountAmount;
                  }
                } else if (coupon.type === 'AMOUNT') {
                  discount = (coupon.discountAmount || 0) * (entry.quantity ?? 1);
                }
                totalDiscount += discount;
                orderAppliedCouponIds.push(coupon.id);
              }
            }

            const totalPaymentAmount = Math.max(0, totalOrderAmount - totalDiscount);

            let orderNumber = '';
            const maxRetries = 5;
            let retryCount = 0;
            let orderCreated = false;

            while (!orderCreated && retryCount < maxRetries) {
              try {
                orderNumber = await this.ordersService.generateOrderNumberInTransaction(
                  tx,
                  orderGroupNumber,
                );

                const orderData: Prisma.OrderCreateInput = {
                  orderNumber,
                  orderGroup: { connect: { orderGroupNumber } },
                  totalOrderAmount,
                  totalPaymentAmount,
                  productName: product.productName || '',
                  productNameWithOptions: product.productName || '',
                  quantity,
                  salePrice,
                  couponUsed: orderAppliedCouponIds,
                  discountAmount: totalDiscount,
                  recipient: shippingAddress?.recipientName || user.name || '',
                  recipientAddressFull: shippingAddress?.addressFull || '',
                  recipientPostalCode: shippingAddress?.postalCode || 0,
                  recipientMobilePhone: shippingAddress?.mobilePhone || user.phoneNumber || '',
                  recipientPhoneNumber: shippingAddress?.phoneNumber || '',
                  deliveryMessage: '',
                  orderDate: today,
                  ordererName: user.name || '',
                  ordererMobilePhone: user.phoneNumber || '',
                  membershipLevelAtOrderTime,
                  product: { connect: { id: product.id } },
                };

                await tx.order.create({ data: orderData });

                this.logger.log(
                  `Created order ${orderNumber}: ${totalOrderAmount} KRW -> ${totalPaymentAmount} KRW (discount: ${totalDiscount})`,
                );
                orderCreated = true;
              } catch (error: any) {
                if (error?.code === 'P2002' && error?.meta?.target?.includes('order_number')) {
                  retryCount++;
                  this.logger.warn(
                    `Duplicate order number ${orderNumber}, retrying (${retryCount}/${maxRetries})`,
                  );
                  await new Promise((resolve) => setTimeout(resolve, 50 * retryCount));
                  continue;
                }
                throw error;
              }
            }

            if (!orderCreated) {
              throw new InternalServerErrorException(
                `Failed to create order for product ${product.id} after ${maxRetries} attempts`,
              );
            }
          }

          this.logger.log(`Created ${orderItems.length} orders for order group ${orderGroupNumber}`);
        },
        { timeout: 30_000, maxWait: 10_000 },
      );

      // 11. Generate customerKey for Toss
      const customerKey = `customer_${userId}`;

      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const successUrl = `${frontendUrl}/payment/success`;
      const failUrl = `${frontendUrl}/payment/fail`;

      this.logger.log('Payment V2 initiated successfully', {
        orderGroupNumber,
        productIdsCount: productIds.length,
        originalAmount,
        couponDiscount: totalCouponDiscount,
        pointsDiscount,
        totalDiscountAmount,
        finalAmount,
        deliveryFee: effectiveDeliveryFee,
        userShippingAddressId,
      });

      const paymentToken = await this.jwtService.signAsync(
        { orderGroupNumber, userId, directPay: true } as PaymentTokenPayload,
        {
          secret: config.JWT_SECRET_ACCESS_TOKEN,
          expiresIn: '1h',
        },
      );

      return {
        orderId: orderGroupNumber,
        originalAmount,
        discountAmount: totalDiscountAmount,
        finalAmount,
        orderGroupName: 'Order Group Number: ' + orderGroupNumber,
        customerKey,
        successUrl,
        failUrl,
        deliveryFee: effectiveDeliveryFee,
        userShippingAddressId,
        cartItems: productIds,
        coupons: appliedCouponIds.map((id) => ({
          couponId: id,
          quantity: 1,
        })),
        paymentToken,
        directPay: true,
      };
    } catch (error) {
      this.logger.error('Failed to initiate payment V2', error);

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
   * Transaction flow: 1. Confirm payment with Toss, 2. Save coupon history / points / payment (orders already created in initiatePayment)
   */
  async confirmPayment(
    dto: ConfirmPaymentRequestDto,
  ): Promise<PaymentResponseDto> {
    // Validate and decode payment token (expires in 1 hour); keep payload for directPay in transaction/catch
    let tokenPayload: PaymentTokenPayload;
    try {
      tokenPayload = await this.jwtService.verifyAsync<PaymentTokenPayload>(
        dto.paymentToken,
        {
          secret: config.JWT_SECRET_ACCESS_TOKEN,
        },
      );
      if (
        tokenPayload.orderGroupNumber !== dto.orderGroupNumber ||
        tokenPayload.userId !== dto.userId
      ) {
        throw new BadRequestException('Payment token is outdated or invalid');
      }
    } catch {
      throw new BadRequestException('Payment token is outdated or invalid');
    }
    const directPay = tokenPayload.directPay === true;

    // Validate userId is provided and is a string
    if (!dto.userId || typeof dto.userId !== 'string') {
      throw new BadRequestException('User ID is required and must be a string');
    }

    // Ensure userId is a string (TypeScript assertion after validation)
    const userId: string = String(dto.userId);
    const validatedDto = { ...dto, userId };

    // Validate minimum payment amount for Toss Payment API
    // Credit card: minimum 100원, Bank account: minimum 200원
    // We validate with 200원 to support all payment methods
    const MINIMUM_PAYMENT_AMOUNT = 200;
    if (validatedDto.amount < MINIMUM_PAYMENT_AMOUNT) {
      throw new BadRequestException(
        `Payment amount must be at least ${MINIMUM_PAYMENT_AMOUNT}원. Current amount: ${validatedDto.amount}원`,
      );
    }

    this.logger.log(`Confirming payment: ${validatedDto.orderGroupNumber}`);

    try {
      // 1. Confirm payment with Toss API FIRST (external call, must be before transaction)
      this.logger.log('Confirming payment with Toss');
      const tossPayment = await this.tossApiService.confirmPayment({
        paymentKey: validatedDto.paymentKey,
        orderId: validatedDto.orderGroupNumber,
        amount: validatedDto.amount,
        deliveryFee: validatedDto.deliveryFee,
      });
      this.logger.log('Payment confirmed with Toss successfully');

      // 2. Execute single database transaction (long timeout: many orders + coupon history + points + payment)
      const result = await this.prisma.$transaction(
        async (tx) => {
        this.logger.log('Starting database transaction');

        // 2.1. Get OrderGroup by orderGroupNumber
        const orderGroup = await tx.orderGroup.findUnique({
          where: { orderGroupNumber: validatedDto.orderGroupNumber },
        });

        if (!orderGroup) {
          throw new NotFoundException(`OrderGroup with number ${validatedDto.orderGroupNumber} not found`);
        }

        this.logger.log(`OrderGroup found with ${orderGroup.cartItemIds.length} cart items`);

        // 2.1b. Delete cart items from cart (skip when directPay: no cart was used)
        if (!directPay && orderGroup.cartItemIds.length > 0) {
          this.logger.log('Deleting cart items');
          await tx.cartItem.deleteMany({
            where: {
              id: { in: orderGroup.cartItemIds },
            },
          });
          this.logger.log(`Deleted ${orderGroup.cartItemIds.length} cart items`);
        } else if (directPay) {
          this.logger.log('Skipping cart item deletion (directPay)');
        }

        // 2.2. Get User
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            availablePoints: true,
            membershipLevel: true,
          },
        });
        const membershipLevelBeforePayment = user?.membershipLevel;

        if (!user) {
          throw new NotFoundException(`User with ID ${userId} not found`);
        }

        // 2.3. Load existing orders (created in initiatePayment)
        const existingOrders = await tx.order.findMany({
          where: { orderGroupNumber: validatedDto.orderGroupNumber },
        });

        if (existingOrders.length === 0) {
          throw new NotFoundException(
            `No orders found for order group ${validatedDto.orderGroupNumber}. Ensure payment was initiated first.`,
          );
        }

        this.logger.log(`Found ${existingOrders.length} existing orders for order group`);

        // 2.4. Collect applied coupon IDs and coupon map for coupon history
        const today = this.formatLocalYyyyMmDd(new Date());
        const allCouponIds = new Set<string>();
        if (validatedDto.coupons && validatedDto.coupons.length > 0) {
          validatedDto.coupons.forEach((c) => allCouponIds.add(c.couponId));
        }

        let couponMap: Map<string, Coupon> = new Map();
        if (allCouponIds.size > 0) {
          const coupons = await tx.coupon.findMany({
            where: { id: { in: Array.from(allCouponIds) } },
          });
          couponMap = new Map(coupons.map((c) => [c.id, c]));
          this.logger.log(`Found ${coupons.length} coupons for order group`);
        }

        // 2.5. Save coupon history: one USED record per (order, coupon)
        if (existingOrders.length > 0 && validatedDto.coupons?.length) {
          const couponQuantityByEntry = new Map<string, number>();
          validatedDto.coupons.forEach((c) => {
            couponQuantityByEntry.set(c.couponId, c.quantity ?? 1);
          });

          for (const order of existingOrders) {
            const orderAmount = order.totalOrderAmount ?? 0;
            for (const couponId of order.couponUsed) {
              const coupon = couponMap.get(couponId);
              if (!coupon) continue;

              let discountAppliedAmount = 0;
              if (coupon.type === 'PERCENT') {
                discountAppliedAmount = Math.floor(
                  (orderAmount * (coupon.discountRate || 0)) / 100,
                );
                if  (
                  coupon.maxDiscountAmount != null &&
                  discountAppliedAmount > coupon.maxDiscountAmount
                ) {
                  discountAppliedAmount = coupon.maxDiscountAmount;
                }
              } else if (coupon.type === 'AMOUNT') {
                const qty = couponQuantityByEntry.get(coupon.id) ?? 1;
                discountAppliedAmount = (coupon.discountAmount || 0) * qty;
              }

              const existingHistory = await tx.couponHistory.findFirst({
                where: {
                  couponId: coupon.id,
                  userId,
                  status: 'ISSUED',
                },
                orderBy: { issuedAt: 'asc' },
              });

              if (existingHistory) {
                if (existingHistory.quantity > (couponQuantityByEntry.get(coupon.id) ?? 1)) {
                  await tx.couponHistory.update({
                    where: { id: existingHistory.id },
                    data: { quantity: { decrement: couponQuantityByEntry.get(coupon.id) ?? 1 } },
                  });
                  await tx.couponHistory.create({
                    data: {
                      quantity: couponQuantityByEntry.get(coupon.id) ?? 1,
                      couponId: coupon.id,
                      userId,
                      orderId: order.id,
                      status: 'USED',
                      issuedAt: new Date(),
                      usedAt: new Date(),
                      discountAppliedAmount: discountAppliedAmount,
                      purchaseAmountAtUse: orderAmount,
                    },
                  });
                } else {
                  await tx.couponHistory.update({
                    where: { id: existingHistory.id },
                    data: {
                      status: 'USED',
                      orderId: order.id,
                      usedAt: new Date(),
                      discountAppliedAmount: discountAppliedAmount,
                      purchaseAmountAtUse: orderAmount,
                    },
                  });
                }
              } else {
                await tx.couponHistory.create({
                  data: {
                    couponId: coupon.id,
                    userId,
                    orderId: order.id,
                    status: 'USED',
                    issuedAt: new Date(),
                    usedAt: new Date(),
                    discountAppliedAmount: discountAppliedAmount,
                    purchaseAmountAtUse: orderAmount,
                  },
                });
              }
              this.logger.log(`Saved coupon history for ${coupon.code} on order ${order.orderNumber}`);
            }
          }
        }

        // 2.6. Apply points if pointsUsed > 0
        if (orderGroup.pointsUsed > 0) {
          this.logger.log(`Applying ${orderGroup.pointsUsed} points`);

          // Create point record
          await tx.point.create({
            data: {
              date: today,
              userId: userId,
              orderGroupNumber: validatedDto.orderGroupNumber,
              pointsType: 'USED',
              availablePointsDeduction: orderGroup.pointsUsed,
              availablePointsBalance: (user?.availablePoints || 0) - orderGroup.pointsUsed,
              content: `Points used for order ${validatedDto.orderGroupNumber}`,
            },
          });

          // Update user's available points
          await tx.user.update({
            where: { id: userId },
            data: {
              availablePoints: { decrement: orderGroup.pointsUsed },
              totalUsedPoints: { increment: orderGroup.pointsUsed },
            },
          });

          this.logger.log(`${orderGroup.pointsUsed} points deducted from user`);
        }

        // 2.7. Update user's total purchase amount
        await tx.user.update({
          where: { id: userId },
          data: {
            totalPurchaseAmount: { increment: orderGroup.finalAmount },
          },
        });

        // 2.8. Save payment to database
        this.logger.log('Saving payment to database');
        const savedPayment = await tx.payment.create({
          data: {
            userId: userId,
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

        // 2.9. Update OrderGroup situation to ORDER_PAYMENT_COMPLETED
        this.logger.log('Updating OrderGroup situation to ORDER_PAYMENT_COMPLETED');
        await tx.orderGroup.update({
          where: { orderGroupNumber: validatedDto.orderGroupNumber },
          data: {
            situation: EOrderSituation.ORDER_PAYMENT_COMPLETED as OrderSituation,
          },
        });
        this.logger.log(`OrderGroup ${validatedDto.orderGroupNumber} situation updated to ORDER_PAYMENT_COMPLETED`);

        this.logger.log('Transaction completed successfully');

        return { payment: savedPayment, membershipLevelBeforePayment };
        },
        { timeout: 30_000, maxWait: 10_000 },
      );

      const { payment, membershipLevelBeforePayment } = result;

      // 2.13. Issue reward points AFTER transaction (avoids deadlock: pointService uses its own connection)
      try {
        await this.pointService.issueAfterPayment(
          userId,
          payment.totalAmount ?? 0,
          validatedDto.orderGroupNumber,
          membershipLevelBeforePayment ?? undefined,
        );
      } catch (pointError) {
        this.logger.error(
          `Payment succeeded but failed to issue reward points for orderGroup ${validatedDto.orderGroupNumber}`,
          pointError,
        );
        // Do not throw: payment is already committed; points can be reconciled by a job if needed
      }

      this.logger.log(`Payment confirmation completed successfully: ${payment.id}`);

      return this.mapToResponseDto(payment);
    } catch (error) {
      this.logger.error('Failed to confirm payment', error);

      if (!directPay) {
        const cartItemIdsToRemove = validatedDto.cartItems;
        if (cartItemIdsToRemove?.length) {
          for (const cartItemId of cartItemIdsToRemove) {
            try {
              await this.cartItemService.removeItem(String(cartItemId));
            } catch (deleteError) {
              this.logger.warn(
                `Failed to remove cart item ${cartItemId} after confirm error`,
                deleteError,
              );
            }
          }
        }
      }

      // Rollback: mark OrderGroup as ORDER_CANCELLED on any failure
      try {
        await this.prisma.orderGroup.updateMany({
          where: { orderGroupNumber: validatedDto.orderGroupNumber },
          data: {
            situation: EOrderSituation.ORDER_CANCELLED as OrderSituation,
          },
        });
        this.logger.log(
          `OrderGroup ${validatedDto.orderGroupNumber} updated to ORDER_CANCELLED after failure`,
        );
      } catch (updateError) {
        this.logger.error(
          `Failed to update OrderGroup ${validatedDto.orderGroupNumber} to ORDER_CANCELLED`,
          updateError,
        );
      }

      // Save failed payment record for audit
      try {
        await this.paymentRepository.create({
          userId: userId,
          orderGroupNumber: validatedDto.orderGroupNumber,
          paymentKey: validatedDto.paymentKey,
          totalAmount: validatedDto.amount,
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
