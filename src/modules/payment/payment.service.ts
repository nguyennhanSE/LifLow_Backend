// import {
//     Injectable,
//     Inject,
// } from '@nestjs/common';
// import { AppLogger } from 'libs/logger';
// import { getTossConfig, getTossClientKey } from 'libs/config';
// import { IPaymentRepository } from './domain/repositories/payment.repository.interface';
// import { PaginateRequestModel, IPaginate } from 'libs/models/paginate/paginate.model';
// import { TossPaymentApiService } from './infrastructure/toss/toss-payment-api.service';
// import { PreparePaymentDto } from './presentations/http/dto/request/prepare-payment.dto';
// import { PreparePaymentResponseDto } from './presentations/http/dto/response/prepare-payment-response.dto';
// import { ConfirmPaymentDto } from './presentations/http/dto/request/confirm-payment.dto';
// import { CancelPaymentDto } from './presentations/http/dto/request/cancel-payment.dto';
// import { PaymentEntity } from './domain/entities/payment.entity';
// import { PrismaService } from '@database/prisma/prisma.service';
// import { PaymentStatus, SubscriptionStatus } from '@prisma/client';
// import { PaymentMapper } from './presentation/mappers/payment.mapper';
// import { v4 as uuidv4 } from 'uuid';
// // import {
//     PaymentPlanNotFoundError,
//     PaymentNoActivePricingError,
//     PaymentAlreadyExistsError,
//     PaymentInvalidOrderIdError,
//     SubscriptionAlreadyActiveError,
//     PaymentAdminNotAllowedError,
//     PaymentConfirmationInProgressError,
//     PaymentNotFoundError,
//     PaymentUnauthorizedError,
//     PaymentAlreadyCanceledError,
//     PaymentNotCancelableError,
//     PaymentCancelAmountInvalidError,
//     PaymentCancelAmountExceedsBalanceError,
//     PaymentSessionExpiredError,
//     PaymentAlreadyProcessedAndUnretrievableError,
//     PaymentFailedError,
//     PaymentAmountMismatchError,
// } from 'libs/errors';
// @Injectable()
// export class PaymentService {
//     private readonly context = PaymentService.name;

//     constructor(
//         @Inject(IPaymentRepository)
//         private readonly paymentRepository: IPaymentRepository,
//         private readonly tossApiService: TossPaymentApiService,
//         private readonly prisma: PrismaService,
//         private readonly logger: AppLogger,
//     ) { }

//     /**
//      * Prepare payment data for Toss Payment Widget
//      * This does NOT create a payment record yet - only prepares data for frontend
//      */
//     async preparePayment(
//         userId: string,
//         dto: PreparePaymentDto,
//         userRoles?: string[],
//     ): Promise<PreparePaymentResponseDto> {
//         this.logger.debug(`[${this.context}] Preparing payment`, { userId, dto, userRoles });

//         try {
//             // 0. Check if user is admin - admins cannot make payments
//             if (userRoles && userRoles.includes('ADMIN')) {
//                 throw new PaymentAdminNotAllowedError();
//             }

//             // 1. Get subscription plan and validate
//             const plan = await this.prisma.subscriptionPlan.findUnique({
//                 where: { id: dto.planId, isActive: true },
//                 include: {
//                     priceHistory: {
//                         where: { isActive: true, isCurrent: true },
//                         take: 1,
//                         orderBy: { changeDate: 'desc' },
//                     },
//                 },
//             });

//             if (!plan) {
//                 throw new PaymentPlanNotFoundError();
//             }

//             if (!plan.priceHistory || plan.priceHistory.length === 0) {
//                 throw new PaymentNoActivePricingError();
//             }

//             // 2. Check if user already has active subscription
//             const existingSubscription = await this.prisma.subscription.findFirst({
//                 where: {
//                     userId,
//                     status: {
//                         in: ['TRIALING', 'ACTIVE'],
//                     },
//                 },
//                 select: {
//                     id: true,
//                     userId: true,
//                     planId: true,
//                     priceSettingId: true,
//                     status: true,
//                     trialStart: true,
//                     trialEnd: true,
//                     currentPeriodStart: true,
//                     currentPeriodEnd: true,
//                     billingKeyId: true,
//                     lastPaymentDate: true,
//                     nextPaymentDate: true,
//                     hasPaymentMethod: true,
//                     monthlyPrice: true,
//                     canceledAt: true,
//                     cancelReason: true,
//                     createdAt: true,
//                     updatedAt: true,
//                     // Exclude new fields until migration is applied:
//                     // paymentRetryCount, lastPaymentError, nextRetryDate
//                 },
//             });

//             if (existingSubscription && existingSubscription.status !== SubscriptionStatus.TRIALING) {
//                 throw new PaymentAlreadyExistsError();
//             }

//             // 3. Calculate final amount from price history
//             const currentPrice = plan.priceHistory[0];
//             const originalAmount = Number(currentPrice.originalPrice);
//             const finalAmount = Number(currentPrice.finalPrice);
//             const discountAmount = originalAmount - finalAmount;

//             // 4. Generate unique orderId (Toss requirement)
//             // Format: sub_{shortUserId}_{timestamp}_{random}
//             // Toss requirements: 6-64 chars, only a-z, A-Z, 0-9, -, _
//             const orderId = this.generateOrderId(userId);

//             // 5. Generate customerKey for this user (Toss requirement)
//             const customerKey = `customer_${userId}`;

//             // 6. Build response with URLs for Toss redirect
//             const tossConfig = getTossConfig();
//             const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

//             const response: PreparePaymentResponseDto = {
//                 orderId,
//                 amount: finalAmount,
//                 originalAmount: originalAmount,
//                 discountAmount: discountAmount,
//                 customerKey,
//                 orderName: `${plan.name} - Monthly Subscription`,
//                 successUrl: tossConfig.successUrl || `${frontendUrl}/payment/success`,
//                 failUrl: tossConfig.failUrl || `${frontendUrl}/payment/fail`,
//             };

//             this.logger.log(`[${this.context}] Payment prepared successfully`, {
//                 orderId,
//                 amount: finalAmount,
//             });

//             return response;
//         } catch (error) {
//             this.logger.error(`[${this.context}] Failed to prepare payment`, error);
//             throw error;
//         }
//     }

//     /**
//      * Confirm payment (after Toss redirect)
//      * This creates the payment record in database
//      */
//     async confirmPayment(
//         userId: string,
//         dto: ConfirmPaymentDto,
//         userRoles?: string[],
//     ): Promise<PaymentEntity> {
//         this.logger.debug(`[${this.context}] Confirming payment`, { userId, dto, userRoles });

//         try {
//             // 0. Check if user is admin - admins cannot make payments
//             if (userRoles && userRoles.includes('ADMIN')) {
//                 throw new PaymentAdminNotAllowedError();
//             }

//             // 1. Validate orderId format
//             if (!dto.orderId.startsWith('sub_')) {
//                 throw new PaymentInvalidOrderIdError();
//             }

//             // 2. Check if payment already exists (idempotency check)
//             const existingPayment =
//                 await this.paymentRepository.findByOrderId(dto.orderId);

//             if (existingPayment) {
//                 this.logger.warn(`[${this.context}] Payment already processed`, {
//                     orderId: dto.orderId,
//                     status: existingPayment.status,
//                     paymentKey: existingPayment.paymentKey,
//                 });

//                 // If already successfully confirmed, return existing payment
//                 if (existingPayment.status === 'DONE') {
//                     this.logger.log(`[${this.context}] Payment already confirmed`, {
//                         orderId: dto.orderId,
//                     });
//                     return existingPayment;
//                 }

//                 // If confirmation is in progress, prevent duplicate processing
//                 if (existingPayment.status === 'IN_PROGRESS') {
//                     throw new PaymentConfirmationInProgressError();
//                 }

//                 // If READY or ABORTED, continue with confirmation (retry scenario)
//                 this.logger.log(`[${this.context}] Retrying payment confirmation`, {
//                     orderId: dto.orderId,
//                     previousStatus: existingPayment.status,
//                 });
//             }

//             // 3. Extract planId from orderId or get from query
//             // For now, get active plan (in production, pass planId through metadata)
//             const plan = await this.prisma.subscriptionPlan.findFirst({
//                 where: { isActive: true },
//                 include: {
//                     priceHistory: {
//                         where: { isCurrent: true },
//                         take: 1,
//                         orderBy: { changeDate: 'desc' },
//                     },
//                 },
//                 orderBy: { price: 'asc' },
//             });

//             if (!plan || !plan.priceHistory || plan.priceHistory.length === 0) {
//                 throw new PaymentPlanNotFoundError();
//             }

//             // 4. Validate amount matches plan final price (or existing payment amount)
//             const currentPrice = plan.priceHistory[0];
//             const expectedAmount = existingPayment
//                 ? Number(existingPayment.totalAmount)
//                 : Number(currentPrice.finalPrice);

//             if (dto.amount !== expectedAmount) {
//                 throw new PaymentAmountMismatchError();
//             }

//             // 5. Call Toss Confirm API
//             let tossPayment;
//             try {
//                 tossPayment = await this.tossApiService.confirmPayment({
//                     paymentKey: dto.paymentKey,
//                     orderId: dto.orderId,
//                     amount: dto.amount,
//                 });
//             } catch (error: any) {
//                 // Handle already processed payment - fetch from Toss and return
//                 if (error.code === 'ALREADY_PROCESSED_PAYMENT' ||
//                     error.message?.includes('ALREADY_PROCESSED_PAYMENT')) {
//                     this.logger.warn(`[${this.context}] Payment already processed on Toss`, {
//                         orderId: dto.orderId,
//                         paymentKey: dto.paymentKey,
//                     });

//                     // If we have existing payment in DB, return it
//                     if (existingPayment) {
//                         this.logger.log(`[${this.context}] Returning existing payment from DB`, {
//                             orderId: dto.orderId,
//                             paymentId: existingPayment.id,
//                         });
//                         return existingPayment;
//                     }

//                     // If not in DB, fetch from Toss and create/update our record
//                     try {
//                         tossPayment = await this.tossApiService.getPayment(dto.paymentKey);
//                         this.logger.log(`[${this.context}] Fetched payment from Toss`, {
//                             orderId: tossPayment.orderId,
//                             status: tossPayment.status,
//                         });

//                         // Create or update payment record
//                         const payment = await this.createOrUpdatePaymentFromToss(
//                             userId,
//                             tossPayment,
//                             plan.id,
//                         );

//                         return PaymentMapper.toEntity(payment);
//                     } catch (fetchError: any) {
//                         this.logger.error(`[${this.context}] Failed to fetch payment from Toss`, fetchError);
//                         throw new PaymentAlreadyProcessedAndUnretrievableError();
//                     }
//                 }

//                 // Handle expired payment session
//                 if (
//                     error.code === 'NOT_FOUND_PAYMENT_SESSION' ||
//                     error.message?.includes('NOT_FOUND_PAYMENT_SESSION') ||
//                     error.message?.includes('Payment session expired')
//                 ) {
//                     this.logger.warn(`[${this.context}] Payment session expired`, {
//                         orderId: dto.orderId,
//                         paymentKey: dto.paymentKey,
//                     });

//                     // Mark as expired in database (if exists)
//                     const existingPayment = await this.paymentRepository.findByOrderId(dto.orderId);
//                     if (existingPayment) {
//                         await this.prisma.payment.update({
//                             where: { id: existingPayment.id },
//                             data: {
//                                 status: 'EXPIRED' as any,
//                                 failureCode: 'PAYMENT_SESSION_EXPIRED',
//                                 failureMessage: 'Payment session has expired and payment data does not exist.',
//                             } as any,
//                         });
//                     }

//                     throw new PaymentSessionExpiredError();
//                 }
//                 // Re-throw other errors
//                 throw error;
//             }

//             // 6. Handle different payment statuses
//             if (tossPayment.status === PaymentStatus.WAITING_FOR_DEPOSIT) {
//                 // Virtual account - waiting for user deposit
//                 // DO NOT activate subscription yet - wait for webhook
//                 const payment = await this.createPaymentRecord(
//                     userId,
//                     tossPayment,
//                     plan.id,
//                     null, // Don't create subscription yet
//                 );

//                 this.logger.log(`[${this.context}] Virtual account issued`, {
//                     orderId: tossPayment.orderId,
//                     paymentKey: tossPayment.paymentKey,
//                     accountNumber: tossPayment.virtualAccount?.accountNumber,
//                     dueDate: tossPayment.virtualAccount?.dueDate,
//                 });

//                 return PaymentMapper.toEntity(payment);
//             }

//             if (tossPayment.status !== 'DONE') {
//                 // Other statuses (ABORTED, EXPIRED, etc.)
//                 throw new PaymentFailedError();
//             }

//             // 7. Check if user already has a subscription
//             const existingSubscription = await this.prisma.subscription.findUnique({
//                 where: { userId },
//                 select: {
//                     id: true,
//                     userId: true,
//                     status: true,
//                     planId: true,
//                 },
//             });

//             if (existingSubscription) {
//                 this.logger.warn(`[${this.context}] User already has a subscription`, {
//                     userId,
//                     subscriptionId: existingSubscription.id,
//                     status: existingSubscription.status,
//                 });
//                 throw new SubscriptionAlreadyActiveError();
//             }

//             // 8. Payment is DONE - create payment and activate subscription
//             const payment = await this.prisma.$transaction(async (tx) => {
//                 // Calculate period dates
//                 const currentPeriodStart = tossPayment.approvedAt
//                     ? new Date(tossPayment.approvedAt)
//                     : new Date();
//                 const currentPeriodEnd = this.calculatePeriodEnd(
//                     currentPeriodStart,
//                     plan.interval || 'MONTHLY',
//                 );

//                 // Create subscription
//                 // Note: trialStart/trialEnd are required fields, but for paid subscriptions
//                 // we use currentPeriodStart/currentPeriodEnd for billing period tracking
//                 const subscription = await tx.subscription.create({
//                     data: {
//                         userId,
//                         planId: plan.id,
//                         status: 'ACTIVE',
//                         trialStart: currentPeriodStart, // Required field
//                         trialEnd: currentPeriodEnd, // Required field
//                         currentPeriodStart,
//                         currentPeriodEnd,
//                         nextPaymentDate: currentPeriodEnd,
//                     },
//                 });

//                 // Create payment record
//                 const paymentData = await tx.payment.create({
//                     data: {
//                         userId,
//                         subscriptionId: subscription.id,
//                         paymentKey: tossPayment.paymentKey,
//                         orderId: tossPayment.orderId,
//                         mId: tossPayment.mId,
//                         lastTransactionKey: tossPayment.lastTransactionKey,
//                         totalAmount: tossPayment.totalAmount,
//                         balanceAmount: tossPayment.balanceAmount,
//                         suppliedAmount: tossPayment.suppliedAmount,
//                         vat: tossPayment.vat,
//                         taxFreeAmount: tossPayment.taxFreeAmount || 0,
//                         taxExemptionAmount: tossPayment.taxExemptionAmount || 0,
//                         status: tossPayment.status as any, // Cast to PaymentStatus enum
//                         type: tossPayment.type as any, // Cast to PaymentType enum
//                         method: tossPayment.method || null,
//                         currency: tossPayment.currency,
//                         orderName: tossPayment.orderName,
//                         requestedAt: new Date(tossPayment.requestedAt),
//                         approvedAt: tossPayment.approvedAt
//                             ? new Date(tossPayment.approvedAt)
//                             : null,
//                         receiptUrl: tossPayment.receipt?.url,
//                         cardInfo: tossPayment.card,
//                         virtualAccountInfo: tossPayment.virtualAccount,
//                         easyPayInfo: tossPayment.easyPay,
//                         transferInfo: tossPayment.transfer,
//                         cancels: tossPayment.cancels,
//                         secret: tossPayment.secret,
//                         metadata: tossPayment.metadata,
//                     },
//                 });

//                 return PaymentMapper.toEntity(paymentData);
//             });

//             this.logger.log(`[${this.context}] Payment confirmed successfully`, {
//                 paymentKey: payment.paymentKey,
//                 orderId: payment.orderId,
//             });

//             // 8. Send notification (async, don't wait)
//             this.sendPaymentSuccessNotification(userId, payment.id).catch((err) => {
//                 this.logger.error('Failed to send notification', err);
//             });

//             return payment;
//         } catch (error) {
//             this.logger.error(`[${this.context}] Failed to confirm payment`, error);
//             throw error;
//         }
//     }

//     /**
//      * Cancel payment (full or partial)
//      */
//     async cancelPayment(
//         userId: string,
//         dto: CancelPaymentDto,
//     ): Promise<PaymentEntity> {
//         this.logger.debug(`[${this.context}] Canceling payment`, { userId, dto });

//         try {
//             // 1. Get payment
//             const payment =
//                 await this.paymentRepository.findByPaymentKey(dto.paymentKey);
//             if (!payment) {
//                 throw new PaymentNotFoundError();
//             }

//             // 2. Verify ownership
//             if (payment.userId !== userId) {
//                 throw new PaymentUnauthorizedError();
//             }

//             // 3. Check if payment is cancelable
//             if (payment.status === 'CANCELED') {
//                 throw new PaymentAlreadyCanceledError();
//             }

//             if (payment.status !== 'DONE' && payment.status !== 'PARTIAL_CANCELED') {
//                 throw new PaymentNotCancelableError();
//             }

//             // 5. Validate partial cancel amount
//             let cancelAmount = dto.cancelAmount;

//             if (cancelAmount) {
//                 // Partial cancel
//                 if (cancelAmount <= 0) {
//                     throw new PaymentCancelAmountInvalidError();
//                 }

//                 if (cancelAmount > Number(payment.balanceAmount)) {
//                     throw new PaymentCancelAmountExceedsBalanceError();
//                 }

//                 this.logger.log(`[${this.context}] Partial cancel requested`, {
//                     paymentKey: dto.paymentKey,
//                     cancelAmount,
//                     balanceAmount: payment.balanceAmount,
//                 });
//             } else {
//                 // Full cancel
//                 cancelAmount = Number(payment.balanceAmount);
//                 this.logger.log(`[${this.context}] Full cancel requested`, {
//                     paymentKey: dto.paymentKey,
//                     cancelAmount,
//                 });
//             }

//             // 6. Call Toss Cancel API
//             const tossCanceledPayment = await this.tossApiService.cancelPayment(
//                 dto.paymentKey,
//                 dto.cancelReason || 'User request',
//                 cancelAmount,
//             );

//             // 6. Update payment record
//             const updatedPayment = await this.prisma.payment.update({
//                 where: { paymentKey: dto.paymentKey },
//                 data: {
//                     status: tossCanceledPayment.status as any,
//                     balanceAmount: Number(tossCanceledPayment.balanceAmount),
//                     cancels: tossCanceledPayment.cancels,
//                     lastTransactionKey: tossCanceledPayment.lastTransactionKey,
//                 },
//                 select: {
//                     id: true,
//                     userId: true,
//                     subscriptionId: true,
//                     paymentKey: true,
//                     orderId: true,
//                     mId: true,
//                     lastTransactionKey: true,
//                     totalAmount: true,
//                     balanceAmount: true,
//                     suppliedAmount: true,
//                     vat: true,
//                     taxFreeAmount: true,
//                     taxExemptionAmount: true,
//                     status: true,
//                     type: true,
//                     method: true,
//                     currency: true,
//                     orderName: true,
//                     requestedAt: true,
//                     approvedAt: true,
//                     failureCode: true,
//                     failureMessage: true,
//                     receiptUrl: true,
//                     cardInfo: true,
//                     virtualAccountInfo: true,
//                     easyPayInfo: true,
//                     transferInfo: true,
//                     cancels: true,
//                     secret: true,
//                     metadata: true,
//                     createdAt: true,
//                     updatedAt: true,
//                 },
//             });

//             // 7. If fully canceled, deactivate subscription
//             if (
//                 tossCanceledPayment.status === 'CANCELED' &&
//                 payment.subscriptionId
//             ) {
//                 await this.prisma.subscription.update({
//                     where: { id: payment.subscriptionId },
//                     data: {
//                         status: 'CANCELED',
//                         canceledAt: new Date(),
//                     },
//                 });
//             }

//             this.logger.log(`[${this.context}] Payment canceled successfully`, {
//                 paymentKey: dto.paymentKey,
//                 status: tossCanceledPayment.status,
//             });

//             return PaymentMapper.toEntity(updatedPayment);
//         } catch (error) {
//             this.logger.error(`[${this.context}] Failed to cancel payment`, error);
//             throw error;
//         }
//     }

//     /**
//      * Get payment by order ID
//      */
//     async getPaymentByOrderId(
//         userId: string,
//         orderId: string,
//     ): Promise<PaymentEntity> {
//         const payment = await this.paymentRepository.findByOrderId(orderId);

//         if (!payment) {
//             throw new PaymentNotFoundError();
//         }

//         if (payment.userId !== userId) {
//             throw new PaymentUnauthorizedError();
//         }

//         return payment;
//     }

//     /**
//      * Get user's payment history with pagination, sorting, and search
//      */
//     async getPaymentHistory(
//         userId: string,
//         req: { page?: number; limit?: number; sort?: 'asc' | 'desc'; sortBy?: string },
//         search?: string,
//     ): Promise<IPaginate<PaymentEntity>> {
//         const paginateReq = new PaginateRequestModel();
//         paginateReq.page = req.page;
//         paginateReq.limit = req.limit;
//         paginateReq.sort = req.sort;
//         paginateReq.sortBy = req.sortBy;

//         return this.paymentRepository.findByUserId(userId, paginateReq, search);
//     }

//     /**
//      * Get all payments (admin) with pagination, sorting, search, and filters
//      * AGGREGATED BY USER - shows one row per user with latest payment data
//      */
//     async getAllPayments(
//         req: { page?: number; limit?: number; sort?: 'asc' | 'desc'; sortBy?: string },
//         filters?: {
//             search?: string;
//             userId?: string;
//             status?: string;
//             startDate?: string;
//             endDate?: string;
//         },
//     ): Promise<any> {
//         const paginateReq = new PaginateRequestModel();
//         paginateReq.page = req.page || 1;
//         paginateReq.limit = req.limit || 20;
//         paginateReq.sort = req.sort || 'desc';
//         paginateReq.sortBy = req.sortBy || 'latestPaymentDate';

//         const page = paginateReq.page;
//         const limit = paginateReq.limit;
//         const skip = (page - 1) * limit;

//         // Build where clause for payments
//         const where: any = {};

//         if (filters?.userId) {
//             where.userId = filters.userId;
//         }

//         if (filters?.status) {
//             where.status = filters.status;
//         }

//         if (filters?.startDate || filters?.endDate) {
//             where.createdAt = {};
//             if (filters.startDate) {
//                 where.createdAt.gte = new Date(filters.startDate);
//             }
//             if (filters.endDate) {
//                 where.createdAt.lte = new Date(filters.endDate);
//             }
//         }

//         // Search in user name/email or orderId
//         if (filters?.search) {
//             where.OR = [
//                 { orderId: { contains: filters.search, mode: 'insensitive' } },
//                 { orderName: { contains: filters.search, mode: 'insensitive' } },
//                 {
//                     user: {
//                         OR: [
//                             { email: { contains: filters.search, mode: 'insensitive' } },
//                             { name: { contains: filters.search, mode: 'insensitive' } },
//                         ],
//                     },
//                 },
//             ];
//         }

//         // Get unique user IDs that have payments matching the filters
//         const userPayments = await this.prisma.payment.findMany({
//             where,
//             select: {
//                 userId: true,
//             },
//             distinct: ['userId'],
//         });

//         const uniqueUserIds = userPayments.map((p) => p.userId);
//         const totalDocs = uniqueUserIds.length;

//         // Apply pagination to user IDs
//         const paginatedUserIds = uniqueUserIds.slice(skip, skip + limit);

//         // Get latest payment for each paginated user
//         const latestPayments = await Promise.all(
//             paginatedUserIds.map(async (userId) => {
//                 const latestPayment = await this.prisma.payment.findFirst({
//                     where: {
//                         ...where,
//                         userId,
//                     },
//                     select: {
//                         id: true,
//                         userId: true,
//                         orderId: true,
//                         totalAmount: true,
//                         status: true,
//                         approvedAt: true,
//                         createdAt: true,
//                         method: true,
//                         orderName: true,
//                         paymentKey: true,
//                     },
//                     orderBy: [
//                         { approvedAt: 'desc' },
//                         { createdAt: 'desc' },
//                     ],
//                 });

//                 return { userId, payment: latestPayment };
//             }),
//         );

//         // Get user details for paginated users
//         const users = await this.prisma.user.findMany({
//             where: {
//                 id: { in: paginatedUserIds },
//             },
//             select: {
//                 id: true,
//                 email: true,
//                 name: true,
//                 avatarUrl: true,
//             },
//         });

//         // Transform into desired format
//         const docs = latestPayments.map(({ userId, payment }) => {
//             const user = users.find((u) => u.id === userId);

//             return {
//                 userId: userId,
//                 userName: user?.name || user?.email || 'Unknown',
//                 userEmail: user?.email || '',
//                 userAvatar: user?.avatarUrl || null,
//                 amount: payment?.totalAmount || 0,
//                 situation: payment?.status || 'N/A',
//                 paymentDate: payment?.approvedAt || payment?.createdAt || null,
//                 paymentId: payment?.id,
//                 orderId: payment?.orderId,
//                 paymentKey: payment?.paymentKey,
//                 method: payment?.method,
//                 orderName: payment?.orderName,
//             };
//         });

//         const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
//         const safePage = Math.min(page, totalPages);
//         const hasPrev = safePage > 1;
//         const hasNext = safePage < totalPages;

//         return {
//             docs,
//             docsCount: docs.length,
//             totalDocs,
//             totalPages,
//             currentPage: safePage,
//             nextPage: hasNext ? safePage + 1 : null,
//             previousPage: hasPrev ? safePage - 1 : null,
//             limit,
//             hasNext,
//             hasPrev,
//         };
//     }

//     /**
//      * Calculate renewal date based on interval
//      */
//     private calculateNextPaymentDate(interval: string): Date {
//         const now = new Date();

//         switch (interval) {
//             case 'MONTHLY':
//                 return new Date(now.setMonth(now.getMonth() + 1));
//             case 'YEARLY':
//                 return new Date(now.setFullYear(now.getFullYear() + 1));
//             default:
//                 return new Date(now.setMonth(now.getMonth() + 1));
//         }
//     }

//     /**
//      * Calculate period end date based on start date and interval
//      */
//     private calculatePeriodEnd(startDate: Date, interval: string): Date {
//         const endDate = new Date(startDate);

//         switch (interval) {
//             case 'MONTHLY':
//                 endDate.setMonth(endDate.getMonth() + 1);
//                 break;
//             case 'YEARLY':
//                 endDate.setFullYear(endDate.getFullYear() + 1);
//                 break;
//             default:
//                 endDate.setMonth(endDate.getMonth() + 1);
//         }

//         return endDate;
//     }

//     /**
//      * Create or update payment record from Toss payment data
//      * Used when payment is already processed on Toss but not in our DB
//      */
//     private async createOrUpdatePaymentFromToss(
//         userId: string,
//         tossPayment: any,
//         planId: string,
//     ) {
//         // Check if payment already exists
//         const existingPayment = await this.paymentRepository.findByPaymentKey(
//             tossPayment.paymentKey,
//         );

//         if (existingPayment) {
//             // Update existing payment with latest Toss data
//             return await this.prisma.payment.update({
//                 where: { paymentKey: tossPayment.paymentKey },
//                 data: {
//                     status: tossPayment.status as any,
//                     balanceAmount: Number(tossPayment.balanceAmount),
//                     approvedAt: tossPayment.approvedAt
//                         ? new Date(tossPayment.approvedAt)
//                         : null,
//                     lastTransactionKey: tossPayment.lastTransactionKey,
//                     cancels: tossPayment.cancels,
//                 },
//                 select: {
//                     id: true,
//                     userId: true,
//                     subscriptionId: true,
//                     paymentKey: true,
//                     orderId: true,
//                     mId: true,
//                     lastTransactionKey: true,
//                     totalAmount: true,
//                     balanceAmount: true,
//                     suppliedAmount: true,
//                     vat: true,
//                     taxFreeAmount: true,
//                     taxExemptionAmount: true,
//                     status: true,
//                     type: true,
//                     method: true,
//                     currency: true,
//                     orderName: true,
//                     requestedAt: true,
//                     approvedAt: true,
//                     failureCode: true,
//                     failureMessage: true,
//                     receiptUrl: true,
//                     cardInfo: true,
//                     virtualAccountInfo: true,
//                     easyPayInfo: true,
//                     transferInfo: true,
//                     cancels: true,
//                     secret: true,
//                     metadata: true,
//                     createdAt: true,
//                     updatedAt: true,
//                 },
//             });
//         }

//         // Create new payment record
//         // If payment is DONE, also create subscription
//         if (tossPayment.status === 'DONE') {
//             // Check if user already has a subscription
//             const existingSubscription = await this.prisma.subscription.findUnique({
//                 where: { userId },
//                 select: {
//                     id: true,
//                     userId: true,
//                     status: true,
//                     planId: true,
//                 },
//             });

//             if (existingSubscription && (existingSubscription.status === SubscriptionStatus.TRIALING || existingSubscription.status === SubscriptionStatus.ACTIVE)) {
//                 this.logger.warn(`[${this.context}] User already has a subscription in createOrUpdatePaymentFromToss`, {
//                     userId,
//                     subscriptionId: existingSubscription.id,
//                     status: existingSubscription.status,
//                 });
//                 throw new SubscriptionAlreadyActiveError();
//             }

//             // Get plan to determine interval
//             const plan = await this.prisma.subscriptionPlan.findUnique({
//                 where: { id: planId },
//                 select: { interval: true },
//             });

//             const interval = plan?.interval || 'MONTHLY';

//             return await this.prisma.$transaction(async (tx) => {
//                 // Calculate period dates
//                 const currentPeriodStart = tossPayment.approvedAt
//                     ? new Date(tossPayment.approvedAt)
//                     : new Date();
//                 const currentPeriodEnd = this.calculatePeriodEnd(
//                     currentPeriodStart,
//                     interval,
//                 );

//                 // Create subscription
//                 // Note: trialStart/trialEnd are required fields, but for paid subscriptions
//                 // we use currentPeriodStart/currentPeriodEnd for billing period tracking
//                 const subscription = await tx.subscription.create({
//                     data: {
//                         userId,
//                         planId: planId,
//                         status: 'ACTIVE',
//                         trialStart: currentPeriodStart, // Required field
//                         trialEnd: currentPeriodEnd, // Required field
//                         currentPeriodStart,
//                         currentPeriodEnd,
//                         nextPaymentDate: currentPeriodEnd,
//                     },
//                 });

//                 // Create payment record
//                 return await tx.payment.create({
//                     data: {
//                         userId,
//                         subscriptionId: subscription.id,
//                         paymentKey: tossPayment.paymentKey,
//                         orderId: tossPayment.orderId,
//                         mId: tossPayment.mId,
//                         lastTransactionKey: tossPayment.lastTransactionKey,
//                         totalAmount: tossPayment.totalAmount,
//                         balanceAmount: tossPayment.balanceAmount,
//                         suppliedAmount: tossPayment.suppliedAmount,
//                         vat: tossPayment.vat,
//                         taxFreeAmount: tossPayment.taxFreeAmount || 0,
//                         taxExemptionAmount: tossPayment.taxExemptionAmount || 0,
//                         status: tossPayment.status as any,
//                         type: tossPayment.type as any,
//                         method: tossPayment.method as any,
//                         currency: tossPayment.currency,
//                         orderName: tossPayment.orderName,
//                         requestedAt: new Date(tossPayment.requestedAt),
//                         approvedAt: tossPayment.approvedAt
//                             ? new Date(tossPayment.approvedAt)
//                             : null,
//                         receiptUrl: tossPayment.receipt?.url,
//                         cardInfo: tossPayment.card,
//                         virtualAccountInfo: tossPayment.virtualAccount,
//                         easyPayInfo: tossPayment.easyPay,
//                         transferInfo: tossPayment.transfer,
//                         cancels: tossPayment.cancels,
//                         secret: tossPayment.secret,
//                         metadata: tossPayment.metadata,
//                     },
//                     select: {
//                         id: true,
//                         userId: true,
//                         subscriptionId: true,
//                         paymentKey: true,
//                         orderId: true,
//                         mId: true,
//                         lastTransactionKey: true,
//                         totalAmount: true,
//                         balanceAmount: true,
//                         suppliedAmount: true,
//                         vat: true,
//                         taxFreeAmount: true,
//                         taxExemptionAmount: true,
//                         status: true,
//                         type: true,
//                         method: true,
//                         currency: true,
//                         orderName: true,
//                         requestedAt: true,
//                         approvedAt: true,
//                         failureCode: true,
//                         failureMessage: true,
//                         receiptUrl: true,
//                         cardInfo: true,
//                         virtualAccountInfo: true,
//                         easyPayInfo: true,
//                         transferInfo: true,
//                         cancels: true,
//                         secret: true,
//                         metadata: true,
//                         createdAt: true,
//                         updatedAt: true,
//                     },
//                 });
//             });
//         }

//         // For other statuses, just create payment without subscription
//         return await this.createPaymentRecord(
//             userId,
//             tossPayment,
//             planId,
//             null,
//         );
//     }

//     /**
//      * Create payment record (helper method for virtual account handling)
//      */
//     private async createPaymentRecord(
//         userId: string,
//         tossPayment: any,
//         planId: string,
//         subscriptionId: string | null,
//     ) {
//         return await this.prisma.payment.create({
//             data: {
//                 userId,
//                 subscriptionId,
//                 paymentKey: tossPayment.paymentKey,
//                 orderId: tossPayment.orderId,
//                 mId: tossPayment.mId,
//                 lastTransactionKey: tossPayment.lastTransactionKey,
//                 totalAmount: tossPayment.totalAmount,
//                 balanceAmount: tossPayment.balanceAmount,
//                 suppliedAmount: tossPayment.suppliedAmount,
//                 vat: tossPayment.vat,
//                 taxFreeAmount: tossPayment.taxFreeAmount || 0,
//                 taxExemptionAmount: tossPayment.taxExemptionAmount || 0,
//                 status: tossPayment.status as any,
//                 type: tossPayment.type as any,
//                 method: tossPayment.method as any,
//                 currency: tossPayment.currency,
//                 orderName: tossPayment.orderName,
//                 requestedAt: new Date(tossPayment.requestedAt),
//                 approvedAt: tossPayment.approvedAt
//                     ? new Date(tossPayment.approvedAt)
//                     : null,
//                 receiptUrl: tossPayment.receipt?.url,
//                 cardInfo: tossPayment.card,
//                 virtualAccountInfo: tossPayment.virtualAccount,
//                 easyPayInfo: tossPayment.easyPay,
//                 transferInfo: tossPayment.transfer,
//                 cancels: tossPayment.cancels,
//                 secret: tossPayment.secret,
//                 metadata: tossPayment.metadata,
//             },
//             select: {
//                 id: true,
//                 userId: true,
//                 subscriptionId: true,
//                 paymentKey: true,
//                 orderId: true,
//                 mId: true,
//                 lastTransactionKey: true,
//                 totalAmount: true,
//                 balanceAmount: true,
//                 suppliedAmount: true,
//                 vat: true,
//                 taxFreeAmount: true,
//                 taxExemptionAmount: true,
//                 status: true,
//                 type: true,
//                 method: true,
//                 currency: true,
//                 orderName: true,
//                 requestedAt: true,
//                 approvedAt: true,
//                 failureCode: true,
//                 failureMessage: true,
//                 receiptUrl: true,
//                 cardInfo: true,
//                 virtualAccountInfo: true,
//                 easyPayInfo: true,
//                 transferInfo: true,
//                 cancels: true,
//                 secret: true,
//                 metadata: true,
//                 createdAt: true,
//                 updatedAt: true,
//             },
//         });
//     }

//     /**
//      * Generate unique orderId compliant with Toss requirements
//      * - 6-64 characters
//      * - Only a-z, A-Z, 0-9, -, _ allowed
//      * - Format: sub_{shortUserId}_{timestamp}_{random}
//      */
//     private generateOrderId(userId: string): string {
//         // Remove hyphens from userId and take first 8 chars for uniqueness
//         const shortUserId = userId.replace(/-/g, '').substring(0, 8);
//         const timestamp = Date.now();
//         // Generate 6-char random string (alphanumeric only)
//         const random = Math.random().toString(36).substring(2, 8).toLowerCase();

//         // Format: sub_{8chars}_{13digits}_{6chars} = ~33 chars (well within 64 limit)
//         return `sub_${shortUserId}_${timestamp}_${random}`;
//     }

//     /**
//      * Activate subscription after payment completion
//      */
//     private async activateSubscription(
//         userId: string,
//         payment: any,
//     ): Promise<void> {
//         if (!payment.subscriptionId) {
//             return;
//         }

//         const subscription = await this.prisma.subscription.findUnique({
//             where: { id: payment.subscriptionId },
//             select: {
//                 id: true,
//                 userId: true,
//                 planId: true,
//                 priceSettingId: true,
//                 status: true,
//                 trialStart: true,
//                 trialEnd: true,
//                 currentPeriodStart: true,
//                 currentPeriodEnd: true,
//                 billingKeyId: true,
//                 lastPaymentDate: true,
//                 nextPaymentDate: true,
//                 hasPaymentMethod: true,
//                 monthlyPrice: true,
//                 canceledAt: true,
//                 cancelReason: true,
//                 createdAt: true,
//                 updatedAt: true,
//                 plan: true,
//             },
//         });

//         if (!subscription || subscription.status === 'ACTIVE') {
//             return;
//         }

//         await this.prisma.subscription.update({
//             where: { id: payment.subscriptionId },
//             data: {
//                 status: 'ACTIVE',
//                 nextPaymentDate: this.calculateNextPaymentDate(
//                     subscription.plan?.interval || 'MONTHLY',
//                 ),
//             },
//         });

//         this.logger.log(`[${this.context}] Subscription activated`, {
//             subscriptionId: payment.subscriptionId,
//             userId,
//         });
//     }

//     /**
//      * Send payment success notification (email/SMS)
//      */
//     private async sendPaymentSuccessNotification(
//         userId: string,
//         paymentId: string,
//     ): Promise<void> {
//         // TODO: Implement email/SMS notification
//         this.logger.log('Sending payment success notification', {
//             userId,
//             paymentId,
//         });
//   }
// }
