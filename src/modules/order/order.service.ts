import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, Order, OrderSituation, OrderGroup } from '@prisma/client';
import {
  CreateOrderDto,
  OrderFilterDto,
  OrderListResponse,
  OrderResponseDto,
  UpdateOrderDto,
  OrderGroupedListResponse,
  OrderGroupedByOrderGroup,
  CreateOrderGroupDto,
  UpdateOrderGroupDto,
  OrderGroupResponseDto,
  OrderGroupFilterDto,
  OrderGroupListResponse,
} from './dto/order.dto';
import { OrderRepository } from './repositories/order.repository';
import { OrderGroupRepository } from './repositories/order-group.repository';
import { 
  toOrderResponseDto, 
  toOrderEntity, 
  toOrderEntityWithRelations,
  toOrderGroupResponseDto,
  toOrderGroupEntity,
  toOrderGroupEntityWithRelations,
} from './mapper/order.mapper';
import { OrderNotFoundException } from './exceptions/order-not-found.exception';
import { OrderValidationException } from './exceptions/order-validation.exception';
import { OrderGroupNotFoundException } from './exceptions/order-group-not-found.exception';
import { OrderGroupValidationException } from './exceptions/order-group-validation.exception';
import { EOrderSituation } from './enum/order.enum';
import { OrderEntity, OrderGroupEntity } from './entities/order.entity';
import { PointService } from '../point/point.service';
import { PrismaService } from 'prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';


type SalesByDayPoint = { date: string; totalPaymentAmount: number };

@Injectable()
export class OrdersService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderGroupRepository: OrderGroupRepository,
    private readonly pointService: PointService,
    private readonly prisma: PrismaService,
    private readonly membershipService: MembershipsService,
  ) {}

  private formatLocalYyyyMmDd(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private parseDateString(dateStr: string): Date | null {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0] || '0', 10);
      const m = parseInt(parts[1] || '1', 10);
      const d = parseInt(parts[2] || '1', 10);
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        return new Date(y, m - 1, d);
      }
    }
    return null;
  }

  /**
   * Create new orders with points and coupons in a transaction
   * - Generates a unique orderNumber and orderGroupNumber when not provided
   * - Validates the user exists if ordererId is present
   * - Creates points for each order with orderNumber = orderGroupNumber
   * - Creates or updates coupon history to USED status (by couponId)
   */
  async create(createOrderDtos: CreateOrderDto[], points: number, userId: string, couponIds: string[] = []): Promise<OrderResponseDto[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
      if (!user) {
        throw new OrderValidationException(`User not found: ${userId}`);
      }
      const ordererName = user.name;
      const ordererMobilePhone = user.phoneNumber;
      const membershipLevelAtOrderTime = await this.membershipService.getUserActiveMembership(userId);

      
      // Generate orderGroupNumber first (common for all orders in this batch)
      let orderGroupNumber: string = (createOrderDtos[0] as any)?.orderGroupNumber || '';
      if (!orderGroupNumber) {
        // Generate a new orderGroupNumber for this batch of orders
        orderGroupNumber = await this.generateUniqueOrderGroupNumber();
      }

      // Execute transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const createdOrders: Array<Order & { user?: any; product?: any }> = [];

        // Create or get OrderGroup
        let orderGroup = await tx.orderGroup.findUnique({
          where: { orderGroupNumber },
        });
        
        if (!orderGroup) {
          orderGroup = await tx.orderGroup.create({
            data: {
              orderGroupNumber,
              originalAmount: createOrderDtos.reduce((acc, curr) => acc + curr.totalOrderAmount, 0),
              discountAmount: 0,
              finalAmount: createOrderDtos.reduce((acc, curr) => acc + curr.totalPaymentAmount, 0),
              pointsUsed: points,
            },
          });
        }

        // Create all orders
        for (const createOrderDto of createOrderDtos) {
          // Generate orderNumber for each order
          let orderNumber = (createOrderDto as any).orderNumber;
          if (!orderNumber) {
            orderNumber = await this.generateUniqueOrderNumber(orderGroupNumber);
          }
          
          // Map CreateOrderDto to Prisma OrderCreateInput
          const orderData: Prisma.OrderCreateInput = {
            orderNumber,
            totalOrderAmount: createOrderDto.totalOrderAmount,
            totalPaymentAmount: createOrderDto.totalPaymentAmount,
            productName: createOrderDto.productName || '',
            productNameWithOptions: createOrderDto.productNameWithOptions || '',
            quantity: createOrderDto.quantity,
            recipient: createOrderDto.recipient || '',
            recipientAddressFull: createOrderDto.recipientAddressFull || '',
            recipientPostalCode: createOrderDto.recipientPostalCode,
            recipientMobilePhone: createOrderDto.recipientMobilePhone || '',
            recipientPhoneNumber: createOrderDto.recipientPhoneNumber || '',
            deliveryMessage: createOrderDto.deliveryMessage || '',
            salePrice: createOrderDto.salePrice,
            paymentType: createOrderDto.paymentType || '',
            paymentMethod: createOrderDto.paymentMethod || '',
            orderDate: createOrderDto.orderDate || this.formatLocalYyyyMmDd(new Date()),
            ordererName: ordererName || '',
            ordererMobilePhone: ordererMobilePhone || '',
            desiredDeliveryDate: createOrderDto.desiredDeliveryDate || '',
            membershipLevelAtOrderTime: membershipLevelAtOrderTime?.membershipName || '',
            couponUsed: couponIds || [],
            discountAmount: (createOrderDto as any).discountAmount || 0,
            cart: {
              connect: { id: createOrderDto.cartId },
            },
            orderGroup: {
              connect: { orderGroupNumber },
            },
          };

          // Add user relation if ordererId is provided
          if (userId) {
            (orderData as any).user = {
              connect: { id: userId },
            };
          }

          // Add product relation if productId is provided
          if (createOrderDto.productId) {
            orderData.product = {
              connect: { id: createOrderDto.productId },
            };
          }

          const created = await tx.order.create({
            data: orderData,
            include: { product: true },
          });

          createdOrders.push(created as Order & { user?: any; product?: any });
        }
        
        // Create point for each order with orderNumber = orderGroupNumber
        if (orderGroupNumber && points > 0) {
          const today = this.formatLocalYyyyMmDd(new Date());
          
          await tx.point.create({
            data: {
              date: today,
              userId: userId,
              orderGroupNumber: orderGroupNumber,
              pointsType: 'USED',
              availablePointsBalance: points,
              content: `Order points for ${orderGroupNumber}`,
            },
          });
        }
        
        // Update user's available points
        await tx.user.update({
          where: { id: userId },
          data: {
            availablePoints: { decrement: points },
            totalUsedPoints: { increment: points },
            totalPurchaseAmount: { increment: createOrderDtos.reduce((acc, curr) => acc + curr.totalPaymentAmount, 0) },
          },
        });

        // Process coupons: create or update coupon history to USED status
        if (couponIds && couponIds.length > 0) {
          const firstOrderId = createdOrders[0]?.id;
          const totalPurchaseAmount = createOrderDtos.reduce((acc, curr) => acc + curr.totalPaymentAmount, 0);
          
          for (const couponId of couponIds) {
            // Get coupon information
            const coupon = await tx.coupon.findUnique({
              where: { id: couponId },
            });

            if (!coupon) {
              throw new OrderValidationException(`Coupon not found: ${couponId}`);
            }

            // Validate coupon is active
            if (!coupon.isActive) {
              throw new OrderValidationException(`Coupon is not active: ${couponId}`);
            }

            // Validate coupon date range
            const now = new Date();
            if (now < coupon.startDate || now > coupon.endDate) {
              throw new OrderValidationException(`Coupon is not valid at this time: ${couponId}`);
            }

            // Validate minimum purchase amount
            if (totalPurchaseAmount < coupon.minPurchaseAmount) {
              throw new OrderValidationException(
                `Purchase amount (${totalPurchaseAmount}) is less than minimum required (${coupon.minPurchaseAmount}) for coupon: ${couponId}`
              );
            }

            // Calculate discount based on coupon type
            let discountAmount = 0;
            if (coupon.type === 'PERCENT' && coupon.discountRate) {
              // Percentage discount
              discountAmount = Math.floor(totalPurchaseAmount * (coupon.discountRate / 100));
              if (coupon.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
              }
            } else if (coupon.type === 'AMOUNT' && coupon.discountAmount) {
              // Fixed amount discount
              discountAmount = coupon.discountAmount;
            }

            // Find existing coupon history for this user and coupon
            let couponHistory = await tx.couponHistory.findFirst({
              where: {
                couponId: couponId,
                userId: userId,
              },
            });

            // If no coupon history exists, create one with ISSUED status first
            if (!couponHistory) {
              couponHistory = await tx.couponHistory.create({
                data: {
                  couponId: couponId,
                  userId: userId,
                  status: 'ISSUED',
                  issuedAt: now,
                  expiredAt: coupon.endDate,
                },
              });
            }

            // Validate coupon history status
            if (couponHistory.status !== 'ISSUED') {
              throw new OrderValidationException(`Coupon already used or cancelled: ${couponId}`);
            }

            // Check expiration
            if (couponHistory.expiredAt && couponHistory.expiredAt < now) {
              throw new OrderValidationException(`Coupon expired: ${couponId}`);
            }

            // Update coupon history to USED
            await tx.couponHistory.update({
              where: { id: couponHistory.id },
              data: {
                status: 'USED',
                usedAt: now,
                orderId: firstOrderId,
                discountAppliedAmount: discountAmount,
                purchaseAmountAtUse: totalPurchaseAmount,
              },
            });
          }
        }

        return createdOrders;
      });

      // Map to response DTOs
      return result.map(order => {
        const orderEntity = toOrderEntity(order);
        return toOrderResponseDto(orderEntity);
      });
    } catch (error) {
      this.handlePrismaError(error, 'Failed to create order');
    }
  }

  /**
   * Get all orders with filtering, pagination, search, and sorting
   */
  async findAll(filterDto: OrderFilterDto): Promise<OrderListResponse> {
    try {
      const page = filterDto.page || 1;
      const limit = filterDto.limit || 10;
      const sortBy = filterDto.sortBy || 'createdAt';
      const sortOrder = filterDto.sortOrder || 'desc';

      const where = this.buildWhereClause(filterDto);
      const orderBy = this.buildOrderByClause(sortBy, sortOrder);
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.orderRepository.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          includeUser: true,
        }),
        this.orderRepository.count(where),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      return {
        orders: orders.map(order => {
          const orderEntity = toOrderEntity(order);
          return toOrderResponseDto(orderEntity);
        }),
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.handlePrismaError(error, 'Failed to fetch orders');
    }
  }

  /**
   * Get all orders grouped by orderGroupNumber with filtering, pagination, search, and sorting
   */
  async findAllGrouped(filterDto: OrderFilterDto): Promise<OrderGroupedListResponse> {
    try {
      const page = filterDto.page || 1;
      const limit = filterDto.limit || 10;
      const sortBy = filterDto.sortBy || 'createdAt';
      const sortOrder = filterDto.sortOrder || 'desc';

      const where = this.buildWhereClause(filterDto);
      const orderBy = this.buildOrderByClause(sortBy, sortOrder);
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.orderRepository.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          includeUser: true,
        }),
        this.orderRepository.count(where),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      // Group orders by orderGroupNumber
      const groupedMap = new Map<string, OrderResponseDto[]>();
      
      orders.forEach(order => {
        const orderEntity = toOrderEntity(order);
        const orderDto = toOrderResponseDto(orderEntity);
        const orderGroupNumber = orderDto.orderGroupNumber || 'null';
        
        if (!groupedMap.has(orderGroupNumber)) {
          groupedMap.set(orderGroupNumber, []);
        }
        groupedMap.get(orderGroupNumber)!.push(orderDto);
      });

      // Convert map to array
      const orderGroups: OrderGroupedByOrderGroup[] = Array.from(groupedMap.entries()).map(([orderGroupNumber, orders]) => ({
        orderGroupNumber: orderGroupNumber === 'null' ? null : orderGroupNumber,
        orders,
      }));

      return {
        orderGroups,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.handlePrismaError(error, 'Failed to fetch orders');
    }
  }

  /**
   * Advanced search with preset periods and full-text search
   */
  async advancedSearch(filterDto: OrderFilterDto): Promise<OrderListResponse> {
    const withPeriod = this.applyPeriodToFilter(filterDto);
    return this.findAll(withPeriod);
  }

  /**
   * Dashboard statistics grouped by order status
   */
  async getDashboardStats(): Promise<Record<string, number>> {
    try {
      const statuses = {
        paymentCompleted: EOrderSituation.ORDER_PAYMENT_COMPLETED,
        inTransit: EOrderSituation.ORDER_BEING_SHIPPED,
        invoiceTransmitted: EOrderSituation.ORDER_SHIPPED,
        cancelled: EOrderSituation.ORDER_CANCELLED,
        returned: EOrderSituation.ORDER_RETURNED,
      };

      const results = await Promise.all(
        Object.values(statuses).map((status) =>
          this.orderRepository.countByStatus(status),
        ),
      );

      const entries = Object.keys(statuses).map((key, idx) => [
        key,
        results[idx],
      ]);

      return Object.fromEntries(entries);
    } catch (error) {
      this.handlePrismaError(error, 'Failed to fetch dashboard statistics');
    }
  }

  /**
   * Dashboard UI statistics:
   * - dailySales: totalPaymentAmount for today (based on orderDate string)
   * - salesLastDays: series for last N days (based on orderDate string)
   * - orderStatus: counts grouped by situation
   */
  async getDashboardUiStats(days = 7): Promise<{
    dailySales: { date: string; totalPaymentAmount: number };
    salesLastDays: SalesByDayPoint[];
    orderStatus: Record<string, number>;
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStr = this.formatLocalYyyyMmDd(today);

      const start = new Date(today);
      start.setDate(today.getDate() - (Math.max(days, 1) - 1));
      const startStr = this.formatLocalYyyyMmDd(start);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = this.formatLocalYyyyMmDd(tomorrow);

      const endExclusive = new Date(start);
      endExclusive.setDate(start.getDate() + Math.max(days, 1));
      const endExclusiveStr = this.formatLocalYyyyMmDd(endExclusive);

      const [orderStatus, dailySalesTotal, grouped] = await Promise.all([
        this.getDashboardStats(),
        this.orderRepository.sumTotalPaymentAmountByOrderDateRange(
          todayStr,
          tomorrowStr,
        ),
        this.orderRepository.sumTotalPaymentAmountGroupByDayByOrderDateRange(
          startStr,
          endExclusiveStr,
        ),
      ]);

      const groupedMap = new Map(grouped.map((g) => [g.date, g.totalPaymentAmount]));
      const series: SalesByDayPoint[] = [];
      for (let i = 0; i < Math.max(days, 1); i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const ds = this.formatLocalYyyyMmDd(d);
        series.push({ date: ds, totalPaymentAmount: groupedMap.get(ds) ?? 0 });
      }

      return {
        dailySales: { date: todayStr, totalPaymentAmount: dailySalesTotal },
        salesLastDays: series,
        orderStatus,
      };
    } catch (error) {
      this.handlePrismaError(error, 'Failed to fetch dashboard UI statistics');
    }
  }

  /**
   * Export filtered orders to CSV
   */
  async exportToCSV(filterDto: OrderFilterDto): Promise<string> {
    try {
      const withPeriod = this.applyPeriodToFilter(filterDto);
      const where = this.buildWhereClause(withPeriod);
      const orders = await this.orderRepository.findMany({
        where,
        orderBy: this.buildOrderByClause(
          withPeriod.sortBy || 'createdAt',
          withPeriod.sortOrder || 'desc',
        ),
        includeUser: true,
      });

      const { format } = await import('fast-csv');

      return await new Promise((resolve, reject) => {
        const chunks: string[] = [];
        const stream = format({ headers: true });

        stream.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
        stream.on('error', (err: Error) => reject(err));
        stream.on('end', () => resolve(chunks.join('')));

        orders.forEach((order) => {
          stream.write({
            주문번호: order.orderNumber || '',
            주문그룹번호: order.orderGroupNumber || '',
            장바구니ID: order.cartId || '',
            총주문금액: order.totalOrderAmount ?? 0,
            총결제금액: order.totalPaymentAmount ?? 0,
            상품번호: order.productId ?? '',
            주문상품명: order.productName || '',
            주문상품명옵션: order.productNameWithOptions || '',
            수량: order.quantity ?? 0,
            수령인: order.recipient || '',
            주소: order.recipientAddressFull || '',
            우편번호: order.recipientPostalCode ?? '',
            휴대전화: order.recipientMobilePhone || '',
            전화번호: order.recipientPhoneNumber || '',
            배송메시지: order.deliveryMessage || '',
            판매가: order.salePrice ?? 0,
            결제구분: order.paymentType || '',
            결제수단: order.paymentMethod || '',
            발주일: order.orderDate || '',
            주문자명: order.ordererName || '',
            주문자휴대전화: order.ordererMobilePhone || '',
            주문자ID: order.ordererId || '',
            희망배송일: order.desiredDeliveryDate || '',
            주문시회원등급: order.membershipLevelAtOrderTime || '',
            상황: '',
            택배사: '',
            송장번호: '',
            사용쿠폰: Array.isArray((order as any).couponUsed) ? (order as any).couponUsed.join(', ') : '',
            할인금액: (order as any).discountAmount ?? 0,
            생성일: order.createdAt?.toISOString?.() || '',
            수정일: order.updatedAt?.toISOString?.() || '',
          });
        });

        stream.end();
      });
    } catch (error) {
      this.handlePrismaError(error, 'Failed to export orders to CSV');
    }
  }

  /**
   * Get a single order by ID (includes user relation)
   */
  async findOne(id: string): Promise<OrderResponseDto> {
    try {
      const order = await this.orderRepository.findById(id, true);

      if (!order) {
        throw new OrderNotFoundException(`Order with id ${id} not found`);
      }

      const orderEntity = toOrderEntity(order);
      return toOrderResponseDto(orderEntity);
    } catch (error) {
      this.handlePrismaError(error, `Failed to fetch order ${id}`);
    }
  }

  /**
   * Update an existing order (partial updates supported)
   */
  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderEntity> {
    try {
      // Ensure order exists
      const existing = await this.orderRepository.findById(id, false);
      if (!existing) {
        throw new OrderNotFoundException(`Order with id ${id} not found`);
      }

      // Validate user if changing ordererId
      if (updateOrderDto.ordererId) {
        const userExists = await this.orderRepository.userExists(
          updateOrderDto.ordererId,
        );
        if (!userExists) {
          throw new OrderValidationException('User not found');
        }
      }

      // Convert EOrderSituation to Prisma OrderSituation if situation is provided
      const updateData: Prisma.OrderUpdateInput = { ...updateOrderDto };
      if (updateOrderDto.situation !== undefined) {
        (updateData as any).situation = updateOrderDto.situation as OrderSituation;
      }

      const updated = await this.orderRepository.update(
        id,
        updateData,
        true,
      );

      return updated;
    } catch (error) {
      this.handlePrismaError(error, `Failed to update order ${id}`);
    }
  }

  /**
   * Delete an order (hard delete)
   */
  async remove(id: string): Promise<{ message: string }> {
    try {
      const existing = await this.orderRepository.findById(id, false);
      if (!existing) {
        throw new OrderNotFoundException(`Order with id ${id} not found`);
      }

      await this.orderRepository.delete(id);

      return { message: `Order ${id} deleted successfully` };
    } catch (error) {
      this.handlePrismaError(error, `Failed to delete order ${id}`);
    }
  }

  /**
   * Build dynamic where clause for filtering and search
   */
  private buildWhereClause(
    filterDto: OrderFilterDto,
  ): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};

    const searchTerms: Prisma.OrderWhereInput[] = [];

    // Exact / partial field searches
    if (filterDto.q) {
      searchTerms.push({
        OR: [
          { orderNumber: { contains: filterDto.q, mode: 'insensitive' } },
          { productName: { contains: filterDto.q, mode: 'insensitive' } },
          { ordererName: { contains: filterDto.q, mode: 'insensitive' } },
          { recipient: { contains: filterDto.q, mode: 'insensitive' } },
        ],
      });
    }

    // General search across multiple fields
    // if (filterDto.search) {
    //   const search = filterDto.search;
    //   searchTerms.push({
    //     OR: [
    //       { orderNumber: { contains: search, mode: 'insensitive' } },
    //       { productName: { contains: search, mode: 'insensitive' } },
    //       { ordererName: { contains: search, mode: 'insensitive' } },
    //       { recipient: { contains: search, mode: 'insensitive' } },
    //     ],
    //   });
    // }

    if (searchTerms.length > 0) {
      where.AND = searchTerms;
    }

    // Order situation/status filter - filter through orderGroup relation
    // Note: Order model doesn't have situation field directly, it's on OrderGroup
    if (filterDto.situation && filterDto.situation !== 'ALL') {
      (where as any).orderGroup = {
        situation: filterDto.situation as OrderSituation,
      };
    }

    // User filter
    if (filterDto.ordererId) {
      where.ordererId = filterDto.ordererId;
    }

    // Handle period filter (convert to dateFrom/dateTo)
    let dateFrom = filterDto.dateFrom;
    let dateTo = filterDto.dateTo;

    if (filterDto.period) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (filterDto.period) {
        case 'today': {
          const d = this.formatLocalYyyyMmDd(today);
          dateFrom = d;
          dateTo = d;
          break;
        }
        case '7d': {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          dateFrom = this.formatLocalYyyyMmDd(sevenDaysAgo);
          dateTo = this.formatLocalYyyyMmDd(today);
          break;
        }
        case '1m': {
          const oneMonthAgo = new Date(today);
          oneMonthAgo.setMonth(today.getMonth() - 1);
          dateFrom = this.formatLocalYyyyMmDd(oneMonthAgo);
          dateTo = this.formatLocalYyyyMmDd(today);
          break;
        }
        case 'all': {
          // No date filter
          dateFrom = undefined;
          dateTo = undefined;
          break;
        }
      }
    }

    // Date range (orderDate stored as string in YYYY-MM-DD or YYYY-MM-DD HH:mm:ss)
    if (dateFrom || dateTo) {
      where.orderDate = {};
      if (dateFrom) {
        (where.orderDate as Prisma.StringFilter).gte = dateFrom;
      }
      if (dateTo) {
        // Add one day to include the entire end date
        const [y, m, d] = dateTo.split('-').map((v) => parseInt(v, 10));
        const endDate = new Date(y, (m ?? 1) - 1, d ?? 1);
        endDate.setDate(endDate.getDate() + 1);
        (where.orderDate as Prisma.StringFilter).lt =
          this.formatLocalYyyyMmDd(endDate);
      }
    }

    return where;
  }

  /**
   * Build orderBy clause with whitelisted fields
   */
  private buildOrderByClause(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Prisma.OrderOrderByWithRelationInput {
    const allowedFields: Array<keyof Order> = [
      'createdAt',
      'updatedAt',
      'orderDate',
      'totalOrderAmount',
      'totalPaymentAmount',
      'orderNumber',
      'productName',
      'ordererName',
      'recipient',
    ];

    const field: keyof Order = allowedFields.includes(
      sortBy as keyof Order,
    )
      ? (sortBy as keyof Order)
      : 'createdAt';

    return { [field]: sortOrder };
  }

  /**
   * Generate a sequential order group number with date prefix (e.g., 20251117-01, 20251117-02, ...)
   */
  async generateOrderGroupNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
    
    const lastOrderGroupNumber = await this.orderGroupRepository.getLastOrderGroupNumber(datePrefix);
    
    let nextNumber = 1;
    
    if (lastOrderGroupNumber) {
      const match = lastOrderGroupNumber.match(/^(\d{8})-(\d+)$/);
      if (match && match[1] === datePrefix) {
        nextNumber = parseInt(match[2], 10) + 1;
      }
    }
    
    // Pad to 7 digits minimum, but allow expansion if needed
    return `${datePrefix}-${nextNumber.toString().padStart(7, '0')}`;
  }

  /**
   * Ensure generated order group number is unique
   */
  async generateUniqueOrderGroupNumber(
    maxAttempts = 5,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const orderGroupNumber = await this.generateOrderGroupNumber();
      const exists = await this.orderGroupRepository.count({ orderGroupNumber });
      if (exists === 0) {
        return orderGroupNumber;
      }
      // If exists, wait a bit and try again (in case of race condition)
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new InternalServerErrorException('Failed to generate unique order group number');
  }

  /**
   * Generate order number under an orderGroupNumber
   * (e.g., orderGroupNumber=20260107-02 -> orderNumber=20260107-02-01)
   */
  async generateOrderNumber(orderGroupNumber: string): Promise<string> {
    if (!orderGroupNumber) {
      throw new InternalServerErrorException('orderGroupNumber is required to generate orderNumber');
    }

    const prefix = `${orderGroupNumber}-`;
    // Get the last order number for this order group
    const lastOrderNumber = await this.orderRepository.getLastOrderNumber(prefix);

    let nextNumber = 1;

    if (lastOrderNumber) {
      // Extract the incremental number from format "<orderGroupNumber>-NN"
      if (lastOrderNumber.startsWith(prefix)) {
        const suffix = lastOrderNumber.slice(prefix.length);
        const parsed = parseInt(suffix, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          nextNumber = parsed + 1;
        }
      }
    }

    // Format with zero-padding (e.g., 20260107-02-01, 20260107-02-02, ...)
    return `${prefix}${nextNumber.toString().padStart(2, '0')}`;
  }

  /**
   * Generate order number within a transaction context
   * This ensures the check happens within the same transaction to avoid race conditions
   */
  async generateOrderNumberInTransaction(
    tx: Prisma.TransactionClient,
    orderGroupNumber: string,
  ): Promise<string> {
    if (!orderGroupNumber) {
      throw new InternalServerErrorException('orderGroupNumber is required to generate orderNumber');
    }

    const prefix = `${orderGroupNumber}-`;
    
    // Get the last order number for this order group within the transaction
    const lastOrder = await tx.order.findFirst({
      where: {
        orderNumber: {
          startsWith: prefix,
        },
      },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });

    const lastOrderNumber = lastOrder?.orderNumber || null;
    let nextNumber = 1;

    if (lastOrderNumber) {
      // Extract the incremental number from format "<orderGroupNumber>-NN"
      if (lastOrderNumber.startsWith(prefix)) {
        const suffix = lastOrderNumber.slice(prefix.length);
        const parsed = parseInt(suffix, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          nextNumber = parsed + 1;
        }
      }
    }

    // Format with zero-padding (e.g., 20260107-02-01, 20260107-02-02, ...)
    return `${prefix}${nextNumber.toString().padStart(2, '0')}`;
  }

  /**
   * Ensure generated order number is unique
   */
  async generateUniqueOrderNumber(
    orderGroupNumber: string,
    maxAttempts = 5,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const orderNumber = await this.generateOrderNumber(orderGroupNumber);
      const exists = await this.orderRepository.count({ orderNumber });
      if (exists === 0) {
        return orderNumber;
      }
      // If exists, wait a bit and try again (in case of race condition)
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new InternalServerErrorException('Failed to generate unique order number');
  }
  
  /**
   * Normalize Prisma errors into meaningful HTTP exceptions
   */
  private handlePrismaError(error: any, defaultMessage: string): never {
    if (error instanceof OrderNotFoundException) {
      throw error;
    }

    if (error?.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new OrderValidationException(
        `Order with this ${field} already exists`,
      );
    }

    if (error?.code === 'P2003') {
      throw new OrderValidationException('Invalid order data');
    }

    if (error?.code === 'P2025') {
      throw new OrderNotFoundException('Order not found');
    }

    if (error?.code === 'P1001') {
      throw new InternalServerErrorException('Database connection error');
    }

    throw new InternalServerErrorException(defaultMessage);
  }

  /**
   * Apply period presets to date range filters
   */
  private applyPeriodToFilter(
    filterDto: OrderFilterDto,
  ): OrderFilterDto {
    const period = filterDto.period;
    if (!period || period === 'all') {
      return filterDto;
    }

    const now = new Date();
    const start = new Date(now);

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      const day = this.formatLocalYyyyMmDd(start);
      return {
        ...filterDto,
        dateFrom: day,
        dateTo: day,
      };
    }

    if (period === '7d') {
      start.setDate(now.getDate() - 6);
    } else if (period === '1m') {
      start.setMonth(now.getMonth() - 1);
    }

    const dateFrom = this.formatLocalYyyyMmDd(start);
    const dateTo = this.formatLocalYyyyMmDd(now);

    return {
      ...filterDto,
      dateFrom,
      dateTo,
    };
  }

  // ============================================
  // ORDER GROUP METHODS
  // ============================================

  /**
   * Create a new order group
   */
  async createOrderGroup(
    createOrderGroupDto: CreateOrderGroupDto,
    userId?: string,
  ): Promise<OrderGroupResponseDto> {
    try {
      // Generate orderGroupNumber if not provided
      let orderGroupNumber = createOrderGroupDto.orderGroupNumber;
      if (!orderGroupNumber) {
        orderGroupNumber = await this.generateUniqueOrderGroupNumber();
      }

      // Validate user if ordererId is provided
      if (createOrderGroupDto.ordererId || userId) {
        const ordererId: string = createOrderGroupDto.ordererId || userId!;
        if (typeof ordererId === 'string' && ordererId.length > 0) {
          const userExists = await this.orderGroupRepository.userExists(ordererId);
          if (!userExists) {
            throw new OrderGroupValidationException(`User not found: ${ordererId}`);
          }
        }
      }

      const orderGroupData: Prisma.OrderGroupCreateInput = {
        orderGroupNumber,
        orderGroupName: createOrderGroupDto.orderGroupName,
        originalAmount: createOrderGroupDto.originalAmount,
        discountAmount: createOrderGroupDto.discountAmount ?? 0,
        finalAmount: createOrderGroupDto.finalAmount,
        pointsUsed: createOrderGroupDto.pointsUsed ?? 0,
        cartItemIds: createOrderGroupDto.cartItemIds ?? [],
        deliveryFee: createOrderGroupDto.deliveryFee ?? 0,
        situation: (createOrderGroupDto.situation ?? EOrderSituation.ORDER_PAYMENT_PENDING) as OrderSituation,
      };

      if (createOrderGroupDto.ordererId || userId) {
        orderGroupData.user = {
          connect: { id: createOrderGroupDto.ordererId || userId! },
        };
      }

      const created = await this.orderGroupRepository.create(orderGroupData, true);
      const orderGroupEntity = toOrderGroupEntityWithRelations(created);
      return toOrderGroupResponseDto(orderGroupEntity);
    } catch (error) {
      this.handleOrderGroupPrismaError(error, 'Failed to create order group');
    }
  }

  /**
   * Get all order groups with filtering, pagination, search, and sorting
   */
  async findAllOrderGroups(filterDto: OrderGroupFilterDto): Promise<OrderGroupListResponse> {
    try {
      const page = filterDto.page || 1;
      const limit = filterDto.limit || 10;
      const sortBy: string | undefined = filterDto.sortBy;
      const sortOrder: 'asc' | 'desc' | undefined = filterDto.sortOrder;

      const where = this.buildOrderGroupWhereClause(filterDto);
      const orderBy = this.buildOrderGroupOrderByClause(sortBy, sortOrder);
      const skip = (page - 1) * limit;

      const [orderGroups, total] = await Promise.all([
        this.orderGroupRepository.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          includeRelations: true,
        }),
        this.orderGroupRepository.count(where),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      return {
        orderGroups: orderGroups.map(orderGroup => {
          const orderGroupEntity = toOrderGroupEntityWithRelations(orderGroup);
          return toOrderGroupResponseDto(orderGroupEntity);
        }),
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.handleOrderGroupPrismaError(error, 'Failed to fetch order groups');
    }
  }

  /**
   * Get a single order group by orderGroupNumber
   */
  async findOneOrderGroup(orderGroupNumber: string): Promise<OrderGroupResponseDto> {
    try {
      const orderGroup = await this.orderGroupRepository.findByOrderGroupNumber(
        orderGroupNumber,
        true,
      );

      if (!orderGroup) {
        throw new OrderGroupNotFoundException(
          `OrderGroup with number ${orderGroupNumber} not found`,
        );
      }

      const orderGroupEntity = toOrderGroupEntityWithRelations(orderGroup);
      return toOrderGroupResponseDto(orderGroupEntity);
    } catch (error) {
      this.handleOrderGroupPrismaError(error, `Failed to fetch order group ${orderGroupNumber}`);
    }
  }

  /**
   * Get an order group by orderGroupNumber (alias for findOneOrderGroup)
   */
  async getOrderGroupByOrderGroupNumber(orderGroupNumber: string): Promise<OrderGroupResponseDto> {
    return this.findOneOrderGroup(orderGroupNumber);
  }

  /**
   * Update an existing order group
   */
  async updateOrderGroup(
    orderGroupNumber: string,
    updateOrderGroupDto: UpdateOrderGroupDto,
  ): Promise<OrderGroupResponseDto> {
    try {
      // Ensure order group exists
      const existing = await this.orderGroupRepository.findByOrderGroupNumber(
        orderGroupNumber,
        true,
      );
      if (!existing) {
        throw new OrderGroupNotFoundException(
          `OrderGroup with number ${orderGroupNumber} not found`,
        );
      }

      // Validate user if changing ordererId
      if (updateOrderGroupDto.ordererId) {
        const ordererId: string = updateOrderGroupDto.ordererId;
        if (typeof ordererId === 'string' && ordererId.length > 0) {
          const userExists = await this.orderGroupRepository.userExists(ordererId);
          if (!userExists) {
            throw new OrderGroupValidationException('User not found');
          }
        }
      }

      // Convert EOrderSituation to Prisma OrderSituation if situation is provided
      const updateData: Prisma.OrderGroupUpdateInput = {};
      if (updateOrderGroupDto.orderGroupName !== undefined) {
        updateData.orderGroupName = updateOrderGroupDto.orderGroupName;
      }
      if (updateOrderGroupDto.originalAmount !== undefined) {
        updateData.originalAmount = updateOrderGroupDto.originalAmount;
      }
      if (updateOrderGroupDto.discountAmount !== undefined) {
        updateData.discountAmount = updateOrderGroupDto.discountAmount;
      }
      if (updateOrderGroupDto.finalAmount !== undefined) {
        updateData.finalAmount = updateOrderGroupDto.finalAmount;
      }
      if (updateOrderGroupDto.pointsUsed !== undefined) {
        updateData.pointsUsed = updateOrderGroupDto.pointsUsed;
      }
      if (updateOrderGroupDto.cartItemIds !== undefined) {
        updateData.cartItemIds = updateOrderGroupDto.cartItemIds;
      }
      if (updateOrderGroupDto.deliveryFee !== undefined) {
        updateData.deliveryFee = updateOrderGroupDto.deliveryFee;
      }
      if (updateOrderGroupDto.ordererId !== undefined) {
        updateData.user = {
          connect: { id: updateOrderGroupDto.ordererId },
        };
      }
      if (updateOrderGroupDto.courierCompany !== undefined) {
        updateData.courierCompany = updateOrderGroupDto.courierCompany;
      }
      if (updateOrderGroupDto.invoiceNumber !== undefined) {
        updateData.invoiceNumber = updateOrderGroupDto.invoiceNumber;
      }
      if (updateOrderGroupDto.invoiceNumber !== undefined && updateOrderGroupDto.courierCompany !== undefined) {
        updateData.situation = EOrderSituation.ORDER_BEING_SHIPPED as OrderSituation;
      }
      if (updateOrderGroupDto.situation !== undefined) {
        updateData.situation = updateOrderGroupDto.situation as OrderSituation;
      }


      const updated = await this.orderGroupRepository.update(
        orderGroupNumber,
        updateData,
        true,
      );

      return updated;
    } catch (error) {
      this.handleOrderGroupPrismaError(error, `Failed to update order group ${orderGroupNumber}`);
    }
  }

  /**
   * Delete an order group (hard delete)
   */
  async removeOrderGroup(orderGroupNumber: string): Promise<{ message: string }> {
    try {
      const existing = await this.orderGroupRepository.findByOrderGroupNumber(
        orderGroupNumber,
        false,
      );
      if (!existing) {
        throw new OrderGroupNotFoundException(
          `OrderGroup with number ${orderGroupNumber} not found`,
        );
      }

      await this.orderGroupRepository.delete(orderGroupNumber);

      return { message: `OrderGroup ${orderGroupNumber} deleted successfully` };
    } catch (error) {
      this.handleOrderGroupPrismaError(error, `Failed to delete order group ${orderGroupNumber}`);
    }
  }

  /**
   * Dashboard statistics grouped by order status (for OrderGroups)
   */
  async getOrderGroupDashboardStats(): Promise<Record<string, number>> {
    try {
      const statuses = {
        paymentPending: EOrderSituation.ORDER_PAYMENT_PENDING,
        paymentCompleted: EOrderSituation.ORDER_PAYMENT_COMPLETED,
        inTransit: EOrderSituation.ORDER_BEING_SHIPPED,
        invoiceTransmitted: EOrderSituation.ORDER_SHIPPED,
        cancelled: EOrderSituation.ORDER_CANCELLED,
        returned: EOrderSituation.ORDER_RETURNED,
      };

      const results = await Promise.all(
        Object.values(statuses).map((status) =>
          this.orderGroupRepository.countBySituation(status),
        ),
      );

      const entries = Object.keys(statuses).map((key, idx) => [
        key,
        results[idx],
      ]);

      return Object.fromEntries(entries);
    } catch (error) {
      this.handleOrderGroupPrismaError(error, 'Failed to fetch dashboard statistics');
    }
  }

  /**
   * Dashboard UI statistics for OrderGroups
   */
  async getOrderGroupDashboardUiStats(days = 7): Promise<{
    dailySales: { date: string; finalAmount: number };
    salesLastDays: SalesByDayPoint[];
    orderStatus: Record<string, number>;
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const start = new Date(today);
      start.setDate(today.getDate() - (Math.max(days, 1) - 1));
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const [orderStatus, dailySalesTotal, grouped] = await Promise.all([
        this.getOrderGroupDashboardStats(),
        this.orderGroupRepository.sumFinalAmountByDateRange(today, tomorrow),
        this.orderGroupRepository.sumFinalAmountGroupByDayByDateRange(start, tomorrow),
      ]);

      const groupedMap = new Map(grouped.map((g) => [g.date, g.finalAmount]));
      const series: SalesByDayPoint[] = [];
      for (let i = 0; i < Math.max(days, 1); i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const ds = this.formatLocalYyyyMmDd(d);
        series.push({ date: ds, totalPaymentAmount: groupedMap.get(ds) ?? 0 });
      }

      return {
        dailySales: { date: this.formatLocalYyyyMmDd(today), finalAmount: dailySalesTotal },
        salesLastDays: series,
        orderStatus,
      };
    } catch (error) {
      this.handleOrderGroupPrismaError(error, 'Failed to fetch dashboard UI statistics');
    }
  }

  /**
   * Export filtered order groups to CSV
   */
  async exportOrderGroupsToCSV(filterDto: OrderGroupFilterDto): Promise<string> {
    try {
      const withPeriod = this.applyPeriodToOrderGroupFilter(filterDto);
      const where = this.buildOrderGroupWhereClause(withPeriod);
      const sortByValue: string | undefined = withPeriod.sortBy;
      const sortOrderValue: 'asc' | 'desc' | undefined = withPeriod.sortOrder;
      const orderGroups = await this.orderGroupRepository.findMany({
        where,
        orderBy: this.buildOrderGroupOrderByClause(sortByValue, sortOrderValue),
        includeRelations: true,
      });

      const { format } = await import('fast-csv');

      return await new Promise((resolve, reject) => {
        const chunks: string[] = [];
        const stream = format({ headers: true });

        stream.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
        stream.on('error', (err: Error) => reject(err));
        stream.on('end', () => resolve(chunks.join('')));

        orderGroups.forEach((orderGroup) => {
          stream.write({
            주문그룹번호: orderGroup.orderGroupNumber || '',
            주문그룹명: orderGroup.orderGroupName || '',
            원래금액: orderGroup.originalAmount ?? 0,
            할인금액: orderGroup.discountAmount ?? 0,
            최종금액: orderGroup.finalAmount ?? 0,
            사용포인트: orderGroup.pointsUsed ?? 0,
            배송비: orderGroup.deliveryFee ?? 0,
            주문자ID: orderGroup.ordererId || '',
            상황: orderGroup.situation || '',
            택배사: orderGroup.courierCompany || '',
            송장번호: orderGroup.invoiceNumber || '',
            생성일: orderGroup.createdAt?.toISOString?.() || '',
            수정일: orderGroup.updatedAt?.toISOString?.() || '',
          });
        });

        stream.end();
      });
    } catch (error) {
      this.handleOrderGroupPrismaError(error, 'Failed to export order groups to CSV');
    }
  }

  /**
   * Build dynamic where clause for OrderGroup filtering and search
   */
  private buildOrderGroupWhereClause(
    filterDto: OrderGroupFilterDto,
  ): Prisma.OrderGroupWhereInput {
    const where: Prisma.OrderGroupWhereInput = {};

    const searchTerms: Prisma.OrderGroupWhereInput[] = [];

    // Exact / partial field searches
    if (filterDto.q) {
      searchTerms.push({
        OR: [
          { orderGroupNumber: { contains: filterDto.q, mode: 'insensitive' } },
          { orderGroupName: { contains: filterDto.q, mode: 'insensitive' } },
        ],
      });
    }

    if (searchTerms.length > 0) {
      where.AND = searchTerms;
    }

    // Order situation/status filter
    if (filterDto.situation && filterDto.situation !== 'ALL') {
      where.situation = filterDto.situation as OrderSituation;
    }

    // User filter
    if (filterDto.ordererId) {
      where.ordererId = filterDto.ordererId;
    }

    // Handle period filter (convert to dateFrom/dateTo)
    let dateFrom: Date | undefined = undefined;
    let dateTo: Date | undefined = undefined;

    if (filterDto.period) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (filterDto.period) {
        case 'today': {
          dateFrom = today;
          dateTo = new Date(today);
          dateTo.setDate(dateTo.getDate() + 1);
          break;
        }
        case '7d': {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          dateFrom = sevenDaysAgo;
          dateTo = new Date(today);
          dateTo.setDate(dateTo.getDate() + 1);
          break;
        }
        case '1m': {
          const oneMonthAgo = new Date(today);
          oneMonthAgo.setMonth(today.getMonth() - 1);
          dateFrom = oneMonthAgo;
          dateTo = new Date(today);
          dateTo.setDate(dateTo.getDate() + 1);
          break;
        }
        case 'all': {
          // No date filter
          dateFrom = undefined;
          dateTo = undefined;
          break;
        }
      }
    } else if (filterDto.dateFrom || filterDto.dateTo) {
      // Convert string dates to Date objects
      if (filterDto.dateFrom && typeof filterDto.dateFrom === 'string') {
        const parsedDate = this.parseDateString(filterDto.dateFrom);
        if (parsedDate) {
          dateFrom = parsedDate;
        }
      }
      if (filterDto.dateTo && typeof filterDto.dateTo === 'string') {
        const parsedDate = this.parseDateString(filterDto.dateTo);
        if (parsedDate) {
          dateTo = parsedDate;
          dateTo.setDate(dateTo.getDate() + 1); // Include the entire end date
        }
      }
    }

    // Date range (createdAt)
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Prisma.DateTimeFilter).gte = dateFrom;
      }
      if (dateTo) {
        (where.createdAt as Prisma.DateTimeFilter).lt = dateTo;
      }
    }

    return where;
  }

  /**
   * Build orderBy clause for OrderGroup with whitelisted fields
   */
  private buildOrderGroupOrderByClause(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Prisma.OrderGroupOrderByWithRelationInput {
    const allowedFields: Array<keyof OrderGroup> = [
      'createdAt',
      'updatedAt',
      'orderGroupNumber',
      'finalAmount',
      'originalAmount',
      'situation',
    ];

    if (sortBy === undefined) {
      sortBy = 'updatedAt';
    }
    if (sortOrder === undefined) {
      sortOrder = 'desc';
    }
    const field: keyof OrderGroup = allowedFields.includes(
      sortBy as keyof OrderGroup,
    )
      ? (sortBy as keyof OrderGroup)
      : 'updatedAt'; // Fallback to updatedAt instead of createdAt

    return { [field]: sortOrder };
  }

  /**
   * Apply period presets to date range filters for OrderGroup
   */
  private applyPeriodToOrderGroupFilter(
    filterDto: OrderGroupFilterDto,
  ): OrderGroupFilterDto {
    const period = filterDto.period;
    if (!period || period === 'all') {
      return filterDto;
    }

    const now = new Date();
    const start = new Date(now);

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return {
        ...filterDto,
        dateFrom: this.formatLocalYyyyMmDd(start),
        dateTo: this.formatLocalYyyyMmDd(end),
      };
    }

    if (period === '7d') {
      start.setDate(now.getDate() - 6);
    } else if (period === '1m') {
      start.setMonth(now.getMonth() - 1);
    }

    const dateFrom = this.formatLocalYyyyMmDd(start);
    const dateTo = this.formatLocalYyyyMmDd(now);

    return {
      ...filterDto,
      dateFrom,
      dateTo,
    };
  }

  /**
   * Normalize Prisma errors into meaningful HTTP exceptions for OrderGroup
   */
  private handleOrderGroupPrismaError(error: any, defaultMessage: string): never {
    if (error instanceof OrderGroupNotFoundException) {
      throw error;
    }

    if (error?.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new OrderGroupValidationException(
        `OrderGroup with this ${field} already exists`,
      );
    }

    if (error?.code === 'P2003') {
      throw new OrderGroupValidationException('Invalid order group data');
    }

    if (error?.code === 'P2025') {
      throw new OrderGroupNotFoundException('OrderGroup not found');
    }

    if (error?.code === 'P1001') {
      throw new InternalServerErrorException('Database connection error');
    }

    throw new InternalServerErrorException(defaultMessage);
  }
}

