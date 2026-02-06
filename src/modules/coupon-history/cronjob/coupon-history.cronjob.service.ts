import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CouponHistoryStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EMembershipLevel } from '../../memberships/enums/membership.enum';
import { getCurrentMonthDateRange } from '../../coupons/helpers/coupon.helper';
import { CouponHistoryService } from '../coupon-history.service';

@Injectable()
export class CouponHistoryCronjobService {
  private readonly logger = new Logger(CouponHistoryCronjobService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cron: phát hành coupon tự động theo targetGrades (hasBeenIssued = false, isAutoIssue = true).
   * startDate/endDate chỉ là thời hạn sử dụng coupon, không dùng để deactivate.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, {
    name: 'auto-issue-coupon-histories',
    timeZone: 'Asia/Seoul',
  })
  async handleScheduledAutoIssueCoupons() {
    this.logger.log('Starting scheduled auto-issue coupons...');
    await this.issueAutoIssueCouponsToTargetGrades();
    this.logger.log('Completed scheduled auto-issue coupons');
  }
  
  /**
   * Phát hành coupon tự động cho user theo targetGrades (EMembershipLevel).
   * Chỉ xử lý coupon có hasBeenIssued = false và isAutoIssue = true.
   * targetGrades rỗng → phát hành cho tất cả user; có giá trị → chỉ user có membershipLevel khớp.
   * Tạo CouponHistory status ISSUED, sau đó đánh dấu coupon hasBeenIssued = true.
   */
  async issueAutoIssueCouponsToTargetGrades(): Promise<{
    couponsProcessed: number;
    historiesCreated: number;
    errors: number;
  }> {
    this.logger.log('Starting auto-issue coupons to target grades...');

    let couponsProcessed = 0;
    let historiesCreated = 0;
    const errors = 0;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Lock coupon rows first so concurrent cron runs don't process the same coupons (avoid duplicate coupon-history)
        await tx.$queryRaw`
          SELECT id FROM coupons
          WHERE (is_active = true AND is_auto_issue = true) OR (is_permanent = true AND is_active = true)
          FOR UPDATE
        `;

        const autoIssueCoupons = await tx.coupon.findMany({
          where: {
            OR: [
              { isActive: true, isAutoIssue: true },
              { isPermanent: true, isActive: true },
            ],
          },
          select: {
            id: true,
            code: true,
            name: true,
            targetGrades: true,
          },
        });

        this.logger.log(`Found ${autoIssueCoupons.length} auto-issue coupon(s) to process`);

        for (const coupon of autoIssueCoupons) {
          const targetGrades = coupon.targetGrades;
          const validGrades: string[] = Object.values(EMembershipLevel);
          const gradesToMatch =
            targetGrades.length > 0
              ? targetGrades.filter((g) => validGrades.includes(g))
              : [];

          if (targetGrades.length > 0 && gradesToMatch.length === 0) {
            this.logger.debug(
              `Coupon ${coupon.code}: no valid targetGrades in EMembershipLevel, skip`,
            );
            continue;
          }

          const users = await tx.user.findMany({
            where:
              gradesToMatch.length > 0
                ? { membershipLevel: { in: gradesToMatch, not: null } }
                : {},
            select: { id: true },
          });

          if (!users.length) {
            this.logger.debug(`Coupon ${coupon.code}: no users with target grades`);
            couponsProcessed++;
            continue;
          }

          const existingHistories = await tx.couponHistory.findMany({
            where: {
              couponId: coupon.id,
              status: CouponHistoryStatus.ISSUED,
              userId: { in: users.map((u) => u.id) },
            },
            select: { id: true, userId: true },
          });

          // Mỗi user chỉ cập nhật một record (lấy bản ghi đầu tiên nếu có nhiều)
          const userIdToHistoryId = new Map<string, string>();
          for (const h of existingHistories) {
            if (!userIdToHistoryId.has(h.userId)) userIdToHistoryId.set(h.userId, h.id);
          }
          const existingIdsToUpdate = Array.from(userIdToHistoryId.values());
          // Deduplicate: mỗi userId chỉ tạo tối đa 1 CouponHistory (tránh trùng do race hoặc data)
          const uniqueUserIds = [...new Set(users.map((u) => u.id))];
          const userIdsToCreate = uniqueUserIds.filter((id) => !userIdToHistoryId.has(id));

          // startDate = start of the month, endDate = end of the month (current month)
          const { startDate: monthStart, endDate: monthEnd } = getCurrentMonthDateRange();

          await tx.coupon.update({
            where: { id: coupon.id },
            data: { startDate: monthStart, endDate: monthEnd },
          });

          if (existingIdsToUpdate.length > 0) {
            await tx.couponHistory.updateMany({
              where: { id: { in: existingIdsToUpdate } },
              data: { quantity: { increment: 1 } },
            });
          }
          if (userIdsToCreate.length > 0) {
            await tx.couponHistory.createMany({
              data: userIdsToCreate.map((userId) => ({
                couponId: coupon.id,
                userId,
                status: CouponHistoryStatus.ISSUED,
                quantity: 1,
                startDate: monthStart,
                endDate: monthEnd,
              })),
            });
          }

          historiesCreated += userIdsToCreate.length;
          couponsProcessed++;
          this.logger.debug(
            `Coupon ${coupon.code} (${coupon.name}): ${userIdsToCreate.length} new, ${existingIdsToUpdate.length} quantity+1`,
          );
        }
      });

      this.logger.log(
        `Auto-issue completed. Coupons: ${couponsProcessed}, Histories created: ${historiesCreated}, Errors: ${errors}`,
      );

      return { couponsProcessed, historiesCreated, errors };
    } catch (error) {
      this.logger.error(
        'Failed to issue auto-issue coupons',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}

export class CouponHistoryExpireCronjobService {
  private readonly logger = new Logger(CouponHistoryExpireCronjobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly couponHistoryService: CouponHistoryService,
  ) {}

  /**
   * Kiểm tra coupon còn trong thời hạn hiệu lực: startDate <= today <= endDate.
   * startDate/endDate null được coi là không giới hạn (luôn thoả).
   */
  isCouponInValidPeriod(coupon: {
    startDate: Date | null;
    endDate: Date | null;
  }): boolean {
    const dateStr = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Seoul',
    });
    const todayStart = new Date(`${dateStr}T00:00:00.000+09:00`);
    if (coupon.endDate != null && coupon.endDate < todayStart) return false;
    return true;
  }

  /**
   * 1) Với từng coupon: nếu startDate <= today <= endDate không thoả thì expireAllByCouponId và set coupon isActive = false.
   * 2) Xoá các coupon history có endDate < today (không quan tâm status).
   * Dùng start of day Asia/Seoul để thống nhất với cron timeZone.
   */
  async expireCouponHistories(): Promise<{ expiredByCoupon: number; deleted: number }> {
    const dateStr = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Seoul',
    });
    const todayStart = new Date(`${dateStr}T00:00:00.000+09:00`);

    const coupons = await this.prisma.coupon.findMany({
      select: { id: true, code: true, startDate: true, endDate: true, isActive: true },
    });

    let expiredByCoupon = 0;
    for (const coupon of coupons) {
      if (!this.isCouponInValidPeriod(coupon)) {
        const count = await this.couponHistoryService.expireAllByCouponId(coupon.id);
        expiredByCoupon += count;
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { isActive: false },
        });
        this.logger.log(`Coupon ${coupon.code} (id=${coupon.id}) outside valid period: isActive=false, expired ${count} histor(y/ies)`);
      }
    }

    const result = await this.prisma.couponHistory.deleteMany({
      where: {
        endDate: { lt: todayStart },
      },
    });

    this.logger.log(
      `Expired coupon histories: ${expiredByCoupon} expired by coupon period, ${result.count} deleted with endDate < ${dateStr}`,
    );
    return { expiredByCoupon, deleted: result.count };
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'expire-coupon-histories',
    timeZone: 'Asia/Seoul',
  })
  async handleScheduledExpireCouponHistories() {
    this.logger.log('Starting scheduled expire coupon histories...');
    await this.expireCouponHistories();
    this.logger.log('Completed scheduled expire coupon histories');
  }
}