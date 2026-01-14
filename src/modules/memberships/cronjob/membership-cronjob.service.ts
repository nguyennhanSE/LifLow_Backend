import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../prisma/prisma.service';

interface MembershipTier {
  id: string;
  name: string | null;
  description: string | null;
  minPrice: number | null;
}

@Injectable()
export class MembershipRecalculationService {
  private readonly logger = new Logger(MembershipRecalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scheduled cron job that runs daily at 2 AM to recalculate user memberships
   * DISABLED: Uncomment @Cron decorator to enable
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'membership-recalculation',
    timeZone: 'Asia/Seoul',
  }) // every day at 2 AM
  async handleScheduledMembershipRecalculation() {
    this.logger.log('Starting scheduled membership recalculation...');
    await this.recalculateAllUserMemberships();
    this.logger.log('Completed scheduled membership recalculation');
  }

  /**
   * Main method to recalculate all user memberships based on their purchase history
   * This should be called when:
   * 1. Admin updates membership minPrice
   * 2. Scheduled cron job runs
   */
  async recalculateAllUserMemberships(): Promise<{
    totalUsersProcessed: number;
    totalUpdated: number;
    totalCreated: number;
    errors: number;
  }> {
    this.logger.log('Starting membership recalculation for all users');

    const startTime = Date.now();
    let totalUsersProcessed = 0;
    let totalUpdated = 0;
    let totalCreated = 0;
    let errors = 0;

    try {
      // 1. Get all membership tiers sorted by minPrice descending
      const membershipTiers = await this.getMembershipTiers();
      
      if (membershipTiers.length === 0) {
        this.logger.warn('No membership tiers found. Skipping recalculation.');
        return { totalUsersProcessed: 0, totalUpdated: 0, totalCreated: 0, errors: 0 };
      }

      this.logger.log(`Found ${membershipTiers.length} membership tiers`);

      // 2. Get all users with their total purchase amounts
      const users = await this.getUsersWithPurchaseAmounts();
      
      this.logger.log(`Processing ${users.length} users`);

      // 3. Process each user
      for (const user of users) {
        try {
          // Update user's totalPurchaseAmount field to match calculated amount
          // await this.syncUserTotalPurchaseAmount(user.id, user.totalPurchaseAmount);

          const result = await this.recalculateUserMembership(
            user.id,
            user.totalPurchaseAmount,
            membershipTiers
          );

          if (result.action === 'created') {
            totalCreated++;
          } else if (result.action === 'updated') {
            totalUpdated++;
          }

          totalUsersProcessed++;
        } catch (error) {
          this.logger.error(
            `Error processing user ${user.id}: ${error.message}`,
            error.stack
          );
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Membership recalculation completed in ${duration}ms. ` +
        `Processed: ${totalUsersProcessed}, Created: ${totalCreated}, ` +
        `Updated: ${totalUpdated}, Errors: ${errors}`
      );

      return { totalUsersProcessed, totalUpdated, totalCreated, errors };
    } catch (error) {
      this.logger.error('Failed to recalculate memberships', error.stack);
      throw error;
    }
  }

  /**
   * Recalculate membership for a specific user
   * Updates both UserMembership relation and User.membershipLevel field
   */
  async recalculateUserMembership(
    userId: string,
    totalPurchaseAmount: number,
    membershipTiers?: MembershipTier[]
  ): Promise<{ action: 'created' | 'updated' | 'unchanged' }> {
    // Get membership tiers if not provided
    if (!membershipTiers) {
      membershipTiers = await this.getMembershipTiers();
    }

    if (membershipTiers.length === 0) {
      this.logger.warn(`No membership tiers available for user ${userId}`);
      return { action: 'unchanged' };
    }

    // Determine appropriate membership tier based on purchase amount
    const appropriateTier = this.determineAppropriateMembershipTier(
      totalPurchaseAmount,
      membershipTiers
    );

    if (!appropriateTier) {
      this.logger.warn(
        `Could not determine appropriate tier for user ${userId} with purchase amount ${totalPurchaseAmount}`
      );
      return { action: 'unchanged' };
    }

    // Check if user already has this membership
    const existingMembership = await this.prisma.userMembership.findFirst({
      where: {
        userId: userId,
        status: 'normal',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    // If user already has the correct membership tier and it's still active, no update needed
    if (existingMembership && 
        existingMembership.membershipId === appropriateTier.id && 
        existingMembership.endDate > now && 
        existingMembership.status === 'normal') {
      // Still update User.membershipLevel to ensure consistency
      await this.updateUserMembershipLevel(userId, appropriateTier.name || '');
      return { action: 'unchanged' };
    }

    // If membership tier has changed or membership expired, update it
    await this.prisma.userMembership.upsert({
      where: {
        userId: userId,
      },
      create: {
        userId: userId,
        membershipId: appropriateTier.id,
        membershipName: appropriateTier.name || '',
        membershipDescription: appropriateTier.description || '',
        status: 'normal',
        startDate: now,
        endDate: oneYearFromNow,
      },
      update: {
        membershipId: appropriateTier.id,
        membershipName: appropriateTier.name || '',
        membershipDescription: appropriateTier.description || '',
        status: 'normal',
        startDate: now,
        endDate: oneYearFromNow,
        updatedAt: now,
      },
    });

    // Update User.membershipLevel field
    await this.updateUserMembershipLevel(userId, appropriateTier.name || '');

    const action = existingMembership && existingMembership.membershipId !== appropriateTier.id 
      ? 'updated' 
      : 'created';

    this.logger.debug(
      `${action === 'updated' ? 'Updated' : 'Created'} membership ${appropriateTier.name || 'Unknown'} for user ${userId}`
    );
    return { action };
  }

  /**
   * Update the membershipLevel field in the User model
   */
  private async updateUserMembershipLevel(
    userId: string,
    membershipLevel: string
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { membershipLevel },
    });
  }

  /**
   * Sync the totalPurchaseAmount field in the User model with calculated order totals
   */
  private async syncUserTotalPurchaseAmount(
    userId: string,
    totalPurchaseAmount: number
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { totalPurchaseAmount },
    });
  }

  /**
   * Get all membership tiers sorted by minPrice (descending)
   */
  private async getMembershipTiers(): Promise<MembershipTier[]> {
    return this.prisma.membership.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        minPrice: true,
      },
      orderBy: {
        minPrice: 'desc',
      },
    });
  }

  /**
   * Get all users with their total purchase amounts from users table
   */
  private async getUsersWithPurchaseAmounts(): Promise<
    Array<{ id: string; totalPurchaseAmount: number }>
  > {
    // Get total purchase amount directly from users table
    const result = await this.prisma.$queryRaw<
      Array<{ id: string; total_purchase_amount: string }>
    >`
      SELECT 
        u.id,
        COALESCE(u.total_purchase_amount, 0) as total_purchase_amount
      FROM users u
    `;

    return result.map((row) => ({
      id: row.id,
      totalPurchaseAmount: parseInt(row.total_purchase_amount, 10) || 0,
    }));
  }

  /**
   * Determine the appropriate membership tier for a given purchase amount
   * Returns the highest tier that the user qualifies for
   */
  private determineAppropriateMembershipTier(
    purchaseAmount: number,
    tiers: MembershipTier[]
  ): MembershipTier | null {
    // Filter out tiers with invalid data
    const validTiers = tiers.filter(tier => 
      tier.name && tier.minPrice !== null && tier.minPrice !== undefined
    );

    // Tiers should be sorted by minPrice descending
    // Return the first tier where purchase amount >= minPrice
    for (const tier of validTiers) {
      if (purchaseAmount >= (tier.minPrice || 0)) {
        return tier;
      }
    }

    // If no tier matches, return the lowest tier (last in the sorted array)
    return validTiers.length > 0 ? validTiers[validTiers.length - 1] : null;
  }

  /**
   * Recalculate memberships for users whose purchase amounts fall within a specific range
   * Useful after updating a specific membership tier's minPrice
   */
  async recalculateMembershipsAfterTierUpdate(
    updatedTierId: string
  ): Promise<{
    totalUsersProcessed: number;
    totalUpdated: number;
    totalCreated: number;
    errors: number;
  }> {
    this.logger.log(
      `Recalculating memberships after tier ${updatedTierId} was updated`
    );

    // Get the updated tier
    const updatedTier = await this.prisma.membership.findUnique({
      where: { id: updatedTierId },
    });

    if (!updatedTier) {
      this.logger.warn(`Tier ${updatedTierId} not found`);
      return { totalUsersProcessed: 0, totalUpdated: 0, totalCreated: 0, errors: 0 };
    }

    // Get all tiers to determine affected users
    const allTiers = await this.getMembershipTiers();

    // Find the next tier (lower minPrice)
    const sortedTiers = [...allTiers].sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
    const updatedTierIndex = sortedTiers.findIndex((t) => t.id === updatedTierId);
    const nextLowerTier = sortedTiers[updatedTierIndex + 1];

    // Determine the range of users to update
    const minAmount = nextLowerTier ? (nextLowerTier.minPrice || 0) : 0;
    const maxAmount = updatedTier.minPrice || 0;

    // For simplicity, we'll just recalculate all users
    // In a production system, you might want to optimize this by only processing affected users
    return await this.recalculateAllUserMemberships();
  }
}

