import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { MembershipRepository } from './repositories/membership.repository';
import { MembershipRecalculationService } from './cronjob/membership-cronjob.service';
import {
  CreateMembershipDto,
  UpdateMembershipDto,
  AssignMembershipDto,
  UpdateUserMembershipDto,
  QueryMembershipDto,
  QueryUserMembershipsDto,
  BulkUpdateMembershipItemDto,
} from './dto/membership.dto';
import { MembershipEntity, UserMembershipEntity } from './entities/membership.entity';
import { IPaginate } from '../../libs/models/paginate/pagimate.model';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

import { AppEventEmitterService } from 'src/libs/event-emitter/event-emitter.service';
import { CacheService } from 'src/libs/cache/cache.service';

@Injectable()
export class MembershipsService implements OnModuleInit {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly membershipRecalculationService: MembershipRecalculationService,
    private readonly cacheService: CacheService,
    private readonly appEventEmitter: AppEventEmitterService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
        // get all membership tiers and cache them on startup
        const tiers = await this.getMembershipTiers();
        // cache until app down
        await this.cacheService.set('membership_tiers', tiers);
        console.log('CacheService initialized: membership tiers cached');
    }catch (err) {
      console.error('CacheService initialization failed:', err);
    }
  }

  // ============= MEMBERSHIP CRUD =============

  async create(createMembershipDto: CreateMembershipDto): Promise<MembershipEntity> {
    // Check if membership with same name already exists
    const existing = await this.membershipRepository.getMembershipByName(
      createMembershipDto.name
    );
    if (existing) {
      throw new BadRequestException(`Membership with name "${createMembershipDto.name}" already exists`);
    }

    return this.membershipRepository.createMembership(createMembershipDto);
  }

  async findAll(query: QueryMembershipDto): Promise<IPaginate<MembershipEntity>> {
    return this.membershipRepository.getMembershipsPaginated({
      page: query.page || 1,
      limit: query.limit || 10,
      sort: query.sortOrder || 'asc',
      sortBy: query.sortBy || 'name',
      search: query.search,
      name: query.name,
      counted: true,
    });
  }

  async findOne(id: string): Promise<MembershipEntity> {
    const membership = await this.membershipRepository.getMembershipById(id);
    if (!membership) {
      throw new NotFoundException(`Membership with id "${id}" not found`);
    }
    return membership;
  }

  async findByName(name: string): Promise<MembershipEntity> {
    const membership = await this.membershipRepository.getMembershipByName(name);
    if (!membership) {
      throw new NotFoundException(`Membership with name "${name}" not found`);
    }
    return membership;
  }

  async update(id: string, updateMembershipDto: UpdateMembershipDto): Promise<MembershipEntity> {
    // Check if membership exists
    const existingMembership = await this.findOne(id);
    if (!existingMembership) {
      throw new NotFoundException(`Membership with id "${id}" not found`);
    }
    // If updating name, check it doesn't conflict with existing
    if (updateMembershipDto.name) {
      const existing = await this.membershipRepository.getMembershipByName(
        updateMembershipDto.name
      );
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Membership with name "${updateMembershipDto.name}" already exists`
        );
      }
    }

    // Check if minPrice is being updated
    const isMinPriceUpdated = updateMembershipDto.minPrice !== undefined;

    // Update the membership
    const updatedMembership = await this.membershipRepository.updateMembership(id, updateMembershipDto);

    // If minPrice was updated, trigger user membership recalculation
    if (isMinPriceUpdated) {
      this.logger.log(
        `MinPrice updated for membership ${id} (${existingMembership.name}). Triggering user membership recalculation...`
      );
      
      // Run recalculation asynchronously to not block the response
      this.membershipRecalculationService
        .recalculateMembershipsAfterTierUpdate(id)
        .then((result) => {
          this.logger.log(
            `Membership recalculation completed: ${JSON.stringify(result)}`
          );
        })
        .catch((error) => {
          this.logger.error(
            `Error during membership recalculation: ${error.message}`,
            error.stack
          );
        });
    }

    return updatedMembership;
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if membership exists
    await this.findOne(id);

    await this.membershipRepository.deleteMembership(id);
    return { message: `Membership with id "${id}" deleted successfully` };
  }

  // ============= USER MEMBERSHIP MANAGEMENT =============

  async assignMembershipToUser(
    assignDto: AssignMembershipDto
  ): Promise<UserMembershipEntity> {
    // Verify membership exists
    const membership = await this.findOne(assignDto.membershipId);

    // Check if user already has this membership
    const existing = await this.membershipRepository.getUserMembership(
      assignDto.userId,
    );
    if (existing) {
      throw new BadRequestException(
        `User already has membership "${membership.name}"`
      );
    }

    // Validate dates
    const startDate = new Date(assignDto.startDate);
    const endDate = new Date(assignDto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.membershipRepository.assignMembershipToUser({
      userId: assignDto.userId,
      membershipId: assignDto.membershipId,
      membershipName: membership.name,
      membershipDescription: membership.description || '',
      status: assignDto.status || 'normal',
      startDate,
      endDate,
    });
  }

  async getUserMemberships(
    userId: string,
    query: QueryUserMembershipsDto
  ): Promise<IPaginate<UserMembershipEntity>> {
    return this.membershipRepository.getUserMembershipsPaginated(userId, {
      page: query.page || 1,
      limit: query.limit || 10,
      sort: query.sortOrder || 'desc',
      sortBy: query.sortBy || 'createdAt',
      status: query.status,
      membershipId: query.membershipId,
      counted: true,
    });
  }

  async getUserActiveMembership(userId: string): Promise<UserMembershipEntity | null> {
    return this.membershipRepository.getUserActiveMembership(userId);
  }

  async getMembershipUsers(
    membershipId: string,
    query: QueryUserMembershipsDto
  ): Promise<IPaginate<UserMembershipEntity>> {
    // Verify membership exists
    await this.findOne(membershipId);

    return this.membershipRepository.getAllUsersByMembership(membershipId, {
      page: query.page || 1,
      limit: query.limit || 10,
      sort: query.sortOrder || 'desc',
      sortBy: query.sortBy || 'createdAt',
      status: query.status,
      counted: true,
    });
  }

  /**
   * Sync UserMembership when User.membershipLevel is updated (e.g. from user update).
   * Looks up membership by name and upserts UserMembership for the user.
   */
  async syncUserMembershipByLevel(userId: string, membershipLevel: string): Promise<UserMembershipEntity> {
    const membershipTiers : MembershipEntity[] | null = await this.cacheService.get('membership_tiers');
    const membership = membershipTiers?.find((tier) => tier.name === membershipLevel);
    if (!membership) {
      throw new NotFoundException(`Membership with name "${membershipLevel}" not found`);
    }
    // 1.Fetch user's existing membership and only upsert if it differs
    const existing = await this.membershipRepository.getUserMembership(userId);
    if (!existing) {
      this.logger.log(`No existing membership for user ${userId}, creating new one with level "${membershipLevel}"`);
      throw new NotFoundException(`No existing membership for user "${userId}", cannot sync by level "${membershipLevel}"`);
    }
    if (existing && existing.membershipId === membership.id) {
      this.logger.log(`User ${userId} already has membership "${membershipLevel}", no update needed`);
      return existing;
    }
    // 2. Upsert user membership with new level and default 1 year duration (or you can adjust as needed)
    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    this.appEventEmitter.emit('userMembership.sync.1', { userId, membership : UserMembershipEntity });
    return this.membershipRepository.upsertUserMembership(userId, {
      membershipId: membership.id,
      membershipName: membership.name ?? membershipLevel,
      membershipDescription: membership.description ?? '',
      startDate: existing.startDate ? existing.startDate : now, // If existing start date is in future, keep it. Otherwise, use now.
      endDate: existing.endDate > now ? existing.endDate : oneYearFromNow, // If existing end date is more than 1 year from now, keep it. Otherwise, set to 1 year from now.
      status: 'normal',
    });
  }
  

  async updateUserMembership(
    userId: string,
    updateDto: UpdateUserMembershipDto
  ): Promise<UserMembershipEntity> {
    // Check if user membership exists
    const existing = await this.membershipRepository.getUserMembership(
      userId
    );
    if (!existing) {
      throw new NotFoundException(
        `User membership not found for user "${userId}"`
      );
    }

    // Validate dates if both are provided
    if (updateDto.startDate && updateDto.endDate) {
      const startDate = new Date(updateDto.startDate);
      const endDate = new Date(updateDto.endDate);
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const updateData: Prisma.UserMembershipUpdateInput= {};
    let membership: MembershipEntity | null = null;

    if (updateDto.membershipLevel) {
      membership = await this.membershipRepository.getMembershipByName(updateDto.membershipLevel);
      if (!membership) {
        throw new NotFoundException(`Membership with name "${updateDto.membershipLevel}" not found`);
      }
      updateData.membership = {
        connect: {
          id: membership.id,
        },
      };
      updateData.membershipName = membership.name;
    }
    if (updateDto.startDate) {
      updateData.startDate = new Date(updateDto.startDate);
    }
    if (updateDto.endDate) {
      updateData.endDate = new Date(updateDto.endDate);
    }
    updateData.updatedAt = new Date();
    updateData.status = updateDto.status ?? 'normal';
    updateData.updatedByAdmin = true;
    
    // Update membership and user membershipLevel in parallel
    const [updatedMembership] = await Promise.all([
      this.membershipRepository.updateUserMembership(userId, updateData),
      membership
        ? this.prisma.user.update({
            where: { id: userId },
            data: { membershipLevel: membership.name },
          })
        : Promise.resolve(),
    ]);
    
    return updatedMembership;
  }

  /**
   * Update only the status field of a user's membership.
   * Called from UserService when admin updates user with membershipStatus.
   */
  async updateUserMembershipStatus(userId: string, status: string): Promise<void> {
    const existing = await this.membershipRepository.getUserMembership(userId);
    if (!existing) {
      this.logger.warn(`No userMembership found for user ${userId}, skipping status update`);
      return;
    }
    await this.membershipRepository.updateUserMembership(userId, {
      status,
      updatedAt: new Date(),
    });
    this.logger.log(`Updated userMembership status to "${status}" for user ${userId}`);
  }

  async removeUserMembership(
    userId: string,
    membershipId: string
  ): Promise<{ message: string }> {
    // Check if user membership exists
    const existing = await this.membershipRepository.getUserMembership(
      userId,
    );
    if (!existing) {
      throw new NotFoundException(
        `User membership not found for user "${userId}" and membership "${membershipId}"`
      );
    }

    await this.membershipRepository.removeUserMembership(userId, membershipId);
    return {
      message: `Membership removed from user "${userId}" successfully`,
    };
  }

  // ============= MEMBERSHIP RECALCULATION =============

  /**
   * Manually trigger membership recalculation for all users
   * This is useful for admins to manually sync memberships with current purchase data
   */
  async recalculateAllMemberships(): Promise<{
    totalUsersProcessed: number;
    totalUpdated: number;
    totalCreated: number;
    errors: number;
  }> {
    this.logger.log('Manual membership recalculation triggered');
    return this.membershipRecalculationService.recalculateAllUserMemberships();
  }
  
  async recalculateUserMembership(userId: string, totalPurchaseAmount: number): Promise<{
    action: 'created' | 'updated' | 'unchanged';
  }> {
    this.logger.log(`Recalculating membership for user ${userId} with total purchase amount ${totalPurchaseAmount}`);
    
    // recalculateUserMembership will fetch membership tiers internally if not provided
    const result = await this.membershipRecalculationService.recalculateUserMembership(
      userId, 
      totalPurchaseAmount
    );
    
    this.logger.log(`Membership recalculation result: ${JSON.stringify(result)}`);
    return result;
  }

  // ============= BULK UPDATE MEMBERSHIPS =============

  /**
   * Bulk update memberships
   * Process multiple membership updates in one request
   */
  async bulkUpdateMemberships(
    updates: BulkUpdateMembershipItemDto[]
  ): Promise<{
    totalProcessed: number;
    successful: number;
    failed: number;
    results: Array<{
      membershipId: string;
      success: boolean;
      data?: MembershipEntity;
      error?: string;
    }>;
  }> {
    this.logger.log(`Processing bulk update for ${updates.length} memberships`);

    const results: Array<{
      membershipId: string;
      success: boolean;
      data?: MembershipEntity;
      error?: string;
    }> = [];

    let successful = 0;
    let failed = 0;

    // Process each update
    for (const update of updates) {
      try {
        const { membershipId, nickName, minPrice, basePeriod } = update;
        
        // Check if membership exists
        const membership = await this.membershipRepository.getMembershipById(membershipId);
        if (!membership) {
          throw new NotFoundException(`Membership with id "${membershipId}" not found`);
        }

        // Prepare update data
        const updateData: UpdateMembershipDto = {};
        if (nickName !== undefined) updateData.nickName = nickName;
        if (minPrice !== undefined) updateData.minPrice = minPrice;
        if (basePeriod !== undefined) updateData.basePeriod = basePeriod;

        // Update the membership
        const updatedMembership = await this.membershipRepository.updateMembership(
          membershipId,
          updateData
        );
        
        results.push({
          membershipId,
          success: true,
          data: updatedMembership,
        });
        
        successful++;
        this.logger.log(`Successfully updated membership: ${membershipId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results.push({
          membershipId: update.membershipId,
          success: false,
          error: errorMessage,
        });
        
        failed++;
        this.logger.error(`Failed to update membership ${update.membershipId}: ${errorMessage}`);
      }
    }

    const summary = {
      totalProcessed: updates.length,
      successful,
      failed,
      results,
    };

    this.logger.log(`Bulk update completed: ${successful} successful, ${failed} failed`);
    
    return summary;
  }

  async getMembershipTiers(): Promise<MembershipEntity[]> {
    return this.membershipRepository.getAllMemberships();
  }
}
