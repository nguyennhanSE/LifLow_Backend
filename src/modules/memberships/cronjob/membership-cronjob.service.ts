import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

interface MembershipTier {
  id: string;
  name: string | null;
  description: string | null;
  minPrice: number | null;
  basePeriod: number | null;
}

@Injectable()
export class MembershipRecalculationService {
  private readonly logger = new Logger(MembershipRecalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main method to recalculate all user memberships based on their purchase history.
   * Calculates totalPurchaseAmount per user using only payments with status SUCCESS
   * within the last basePeriod months, then assigns the appropriate membership tier.
   * This should be called when:
   * 1. Admin updates membership minPrice
   * 2. Any external trigger requires recalculation
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

      // Use the basePeriod from the lowest tier as the common window for all users.
      // The lowest tier (last in descending sort) defines the minimum qualifying period.
      const basePeriod = membershipTiers[membershipTiers.length - 1]?.basePeriod ?? 3;

      this.logger.log(`Found ${membershipTiers.length} membership tiers, basePeriod=${basePeriod} months`);

      // 2. Calculate totalPurchaseAmount per user from SUCCESS payments within basePeriod months
      const users = await this.getUsersWithPurchaseAmounts(basePeriod);
      
      this.logger.log(`Processing ${users.length} users`);

      // 3. Process each user
      for (const user of users) {
        try {
          // Sync the period-based purchase amount back to the user record
          await this.syncUserTotalPurchaseAmount(user.id, user.totalPurchaseAmount);

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
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          const stack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `Error processing user ${user.id}: ${message}`,
            stack
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
    } catch (error : unknown) {
      this.logger.error('Failed to recalculate memberships', error instanceof Error ? error.stack : undefined);
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
   * Sync the period-based totalPurchaseAmount back to the User record
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
        basePeriod: true,
      },
      orderBy: {
        minPrice: 'desc',
      },
    });
  }

  /**
   * Get all users with their total purchase amounts calculated from SUCCESS payments
   * within the last basePeriod months.
   * Users who have no qualifying payments are still included with amount = 0.
   */
  private async getUsersWithPurchaseAmounts(basePeriod: number): Promise<
    Array<{ id: string; totalPurchaseAmount: number }>
  > {
    const result = await this.prisma.$queryRaw<
      Array<{ id: string; total_purchase_amount: string }>
    >`
      SELECT
        u.id,
        COALESCE(SUM(p.total_amount - p.canceled_amount), 0) AS total_purchase_amount
      FROM users u
      LEFT JOIN payments p
        ON p.user_id = u.id
        AND p.status = 'SUCCESS'
        AND p.approved_at >= NOW() - (${basePeriod}::int || ' months')::INTERVAL
      GROUP BY u.id
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

