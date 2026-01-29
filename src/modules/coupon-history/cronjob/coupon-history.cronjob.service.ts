import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CouponHistoryStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EMembershipLevel } from '../../memberships/enums/membership.enum';

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
    let errors = 0;

    try {
      const autoIssueCoupons = await this.prisma.coupon.findMany({
        where: {
          canAutoIssue: true,
          hasBeenIssued: false,
          isAutoIssue: true,
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
        try {
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

          const users = await this.prisma.user.findMany({
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

          const existingHistories = await this.prisma.couponHistory.findMany({
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
          const userIdsToCreate = users.map((u) => u.id).filter((id) => !userIdToHistoryId.has(id));

          if (existingIdsToUpdate.length > 0) {
            await this.prisma.couponHistory.updateMany({
              where: { id: { in: existingIdsToUpdate } },
              data: { quantity: { increment: 1 } },
            });
          }
          if (userIdsToCreate.length > 0) {
            await this.prisma.couponHistory.createMany({
              data: userIdsToCreate.map((userId) => ({
                couponId: coupon.id,
                userId,
                status: CouponHistoryStatus.ISSUED,
                quantity: 1,
              })),
            });
          }

          await this.prisma.coupon.update({
            where: { id: coupon.id },
            data: { hasBeenIssued: true },
          });

          historiesCreated += userIdsToCreate.length;
          couponsProcessed++;
          this.logger.debug(
            `Coupon ${coupon.code} (${coupon.name}): ${userIdsToCreate.length} new, ${existingIdsToUpdate.length} quantity+1`,
          );
        } catch (error) {
          this.logger.error(
            `Error issuing coupon ${coupon.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : undefined,
          );
          errors++;
        }
      }

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
