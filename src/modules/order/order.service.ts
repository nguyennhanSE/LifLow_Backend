import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, Order } from '@prisma/client';
import {
  CreateOrderDto,
  OrderFilterDto,
  OrderListResponse,
  OrderResponseDto,
  UpdateOrderDto,
} from './dto/order.dto';
import { OrderRepository } from './repositories/order.repository';
import { toOrderResponseDto, toOrderEntity, toOrderEntityWithRelations } from './mapper/order.mapper';
import { OrderNotFoundException } from './exceptions/order-not-found.exception';
import { OrderValidationException } from './exceptions/order-validation.exception';
import { EOrderSituation } from './enum/order.enum';
import { OrderEntity } from './entities/order.entity';
import { PointService } from '../point/point.service';
import { PrismaService } from 'prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';


type SalesByDayPoint = { date: string; totalPaymentAmount: number };

@Injectable()
export class OrdersService {
  constructor(
    private readonly orderRepository: OrderRepository,
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

  /**
   * Create new orders with points in a transaction
   * - Generates a unique orderNumber and orderGroupNumber when not provided
   * - Validates the user exists if ordererId is present
   * - Creates points for each order with orderNumber = orderGroupNumber
   */
  async create(createOrderDtos: CreateOrderDto[], points: number, userId: string): Promise<OrderResponseDto[]> {
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
            },
          });
        }

        // Create all orders
        for (const createOrderDto of createOrderDtos) {
          // Generate orderNumber for each order
          let orderNumber = (createOrderDto as any).orderNumber;
          if (!orderNumber) {
            orderNumber = await this.generateUniqueOrderNumber();
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
            situation: (createOrderDto as any).situation,
            courierCompany: (createOrderDto as any).courierCompany,
            invoiceNumber: (createOrderDto as any).invoiceNumber,
            cart: {
              connect: { id: createOrderDto.cartId },
            },
            orderGroup: {
              connect: { orderGroupNumber },
            },
          };

          // Add user relation if ordererId is provided
          if (userId) {
            orderData.user = {
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
            include: { user: true, product: true },
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
              orderNumber: orderGroupNumber,
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
        newOrders: EOrderSituation.ORDER_NEW,
        paymentCompleted: EOrderSituation.ORDER_PAYMENT_COMPLETED,
        preparingProduct: EOrderSituation.ORDER_IN_PREPARE,
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
            상황: (order as any).situation || '',
            택배사: order.courierCompany || '',
            송장번호: order.invoiceNumber || '',
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

      const updated = await this.orderRepository.update(
        id,
        {
          ...updateOrderDto,
        },
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

    // Order situation/status filter
    if (filterDto.situation && filterDto.situation !== 'ALL') {
      where.situation = filterDto.situation;
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
  private async generateOrderGroupNumber(): Promise<string> {
    // Get today's date in YYYYMMDD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
    
    // Get the last order group number for today
    const lastOrderGroupNumber = await this.orderRepository.getLastOrderGroupNumber(datePrefix);
    
    let nextNumber = 1;
    
    if (lastOrderGroupNumber) {
      // Extract number from format "YYYYMMDD-NN"
      const match = lastOrderGroupNumber.match(/^(\d{8})-(\d+)$/);
      if (match && match[1] === datePrefix) {
        nextNumber = parseInt(match[2], 10) + 1;
      } else {
        // If format doesn't match, start from 01 for today
        nextNumber = 1;
      }
    }
    
    // Format with zero-padding (e.g., 20251117-01, 20251117-02, ..., 20251117-100)
    return `${datePrefix}-${nextNumber.toString().padStart(2, '0')}`;
  }

  /**
   * Ensure generated order group number is unique
   */
  private async generateUniqueOrderGroupNumber(
    maxAttempts = 5,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const orderGroupNumber = await this.generateOrderGroupNumber();
      const exists = await this.orderRepository.count({ orderGroupNumber });
      if (exists === 0) {
        return orderGroupNumber;
      }
      // If exists, wait a bit and try again (in case of race condition)
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new InternalServerErrorException('Failed to generate unique order group number');
  }

  /**
   * Generate order number with date prefix (e.g., 20251231-01, 20251231-02, ...)
   */
  private async generateOrderNumber(): Promise<string> {
    // Get today's date in YYYYMMDD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
    
    // Get the last order number for today
    const lastOrderNumber = await this.orderRepository.getLastOrderNumber(datePrefix);
    
    let nextNumber = 1;
    
    if (lastOrderNumber) {
      // Extract number from format "YYYYMMDD-NN"
      const match = lastOrderNumber.match(/^(\d{8})-(\d+)$/);
      if (match && match[1] === datePrefix) {
        nextNumber = parseInt(match[2], 10) + 1;
      } else {
        // If format doesn't match, start from 01 for today
        nextNumber = 1;
      }
    }
    
    // Format with zero-padding (e.g., 20251231-01, 20251231-02, ..., 20251231-100)
    return `${datePrefix}-${nextNumber.toString().padStart(2, '0')}`;
  }

  /**
   * Ensure generated order number is unique
   */
  private async generateUniqueOrderNumber(
    maxAttempts = 5,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const orderNumber = await this.generateOrderNumber();
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
}

