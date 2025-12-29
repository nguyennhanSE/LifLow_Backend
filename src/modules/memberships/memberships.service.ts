import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { MembershipRepository } from './repositories/membership.repository';
import { MembershipRecalculationService } from './cronjob/membership-cronjob.service';
import {
  CreateMembershipDto,
  UpdateMembershipDto,
  AssignMembershipDto,
  UpdateUserMembershipDto,
  QueryMembershipDto,
  QueryUserMembershipsDto,
} from './dto/membership.dto';
import { MembershipEntity, UserMembershipEntity } from './entities/membership.entity';
import { IPaginate } from '../../libs/models/paginate/pagimate.model';
import { Prisma } from '@prisma/client';

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly membershipRecalculationService: MembershipRecalculationService,
  ) {}

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

    if (updateDto.membershipLevel) {
      const membership = await this.membershipRepository.getMembershipByName(updateDto.membershipLevel);
      if (!membership) {
        throw new NotFoundException(`Membership with name "${updateDto.membershipLevel}" not found`);
      }
      updateData.membership = {
        connect: {
          id: membership.id,
        },
      };
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

    return await this.membershipRepository.updateUserMembership(userId, updateData);
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
}
