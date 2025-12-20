import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { MembershipEntity, UserMembershipEntity } from '../entities/membership.entity';
import { IPaginate, PaginateOptions } from '../../../libs/models/paginate/pagimate.model';

// Mapper functions
function toMembershipEntity(membership: any): MembershipEntity {
  return {
    id: membership.id,
    name: membership.name,
    description: membership.description,
    minPrice: membership.minPrice,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}

function toUserMembershipEntity(userMembership: any): UserMembershipEntity {
  return {
    userId: userMembership.userId,
    membershipId: userMembership.membershipId,
    membershipName: userMembership.membershipName,
    membershipDescription: userMembership.membershipDescription,
    status: userMembership.status,
    startDate: userMembership.startDate,
    endDate: userMembership.endDate,
    createdAt: userMembership.createdAt,
    updatedAt: userMembership.updatedAt,
    membership: userMembership.membership ? toMembershipEntity(userMembership.membership) : undefined,
    user: userMembership.user ? {
      id: userMembership.user.id,
      name: userMembership.user.name,
      email: userMembership.user.email,
    } : undefined,
  };
}

@Injectable()
export class MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============= MEMBERSHIP CRUD =============
  
  async createMembership(data: Prisma.MembershipCreateInput): Promise<MembershipEntity> {
    const membership = await this.prisma.membership.create({
      data,
    });
    return toMembershipEntity(membership);
  }

  async getMembershipById(id: string): Promise<MembershipEntity | null> {
    const membership = await this.prisma.membership.findUnique({
      where: { id },
    });
    return membership ? toMembershipEntity(membership) : null;
  }

  async getMembershipByName(name: string): Promise<MembershipEntity | null> {
    const membership = await this.prisma.membership.findUnique({
      where: { name },
    });
    return membership ? toMembershipEntity(membership) : null;
  }

  async getMembershipsPaginated(
    options: PaginateOptions & { search?: string; name?: string }
  ): Promise<IPaginate<MembershipEntity>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const sort = options.sort || 'asc';
    const sortBy = options.sortBy || 'name';
    const counted = options.counted ?? true;

    // Build where clause
    const where: Prisma.MembershipWhereInput = {};

    if (options.name) {
      where.name = options.name;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const allowedSortFields = ['name', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    const orderBy: any = { [sortField]: sort };

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute queries
    const [docs, totalDocs] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      counted ? this.prisma.membership.count({ where }) : Promise.resolve(0),
    ]);

    const mappedDocs = docs.map(toMembershipEntity);

    // Calculate pagination metadata
    const totalPages = counted ? Math.ceil(totalDocs / limit) : 0;
    const currentPage = page;
    const nextPage = currentPage < totalPages ? currentPage + 1 : null;
    const previousPage = currentPage > 1 ? currentPage - 1 : null;
    const hasNext = nextPage !== null;
    const hasPrev = previousPage !== null;

    if (counted) {
      return {
        docs: mappedDocs,
        docsCount: mappedDocs.length,
        totalDocs,
        totalPages,
        currentPage,
        nextPage,
        previousPage,
        limit,
        hasNext,
        hasPrev,
      };
    } else {
      return {
        docs: mappedDocs,
        currentPage,
        nextPage,
        previousPage,
        limit,
        hasNext,
        hasPrev,
      };
    }
  }

  async updateMembership(
    id: string,
    data: Prisma.MembershipUpdateInput
  ): Promise<MembershipEntity> {
    const membership = await this.prisma.membership.update({
      where: { id },
      data,
    });
    return toMembershipEntity(membership);
  }

  async deleteMembership(id: string): Promise<void> {
    await this.prisma.membership.delete({
      where: { id },
    });
  }

  // ============= USER MEMBERSHIP CRUD =============

  async assignMembershipToUser(data: {
    userId: string;
    membershipId: string;
    membershipName: string;
    membershipDescription: string;
    status: string;
    startDate: Date;
    endDate: Date;
  }): Promise<UserMembershipEntity> {
    const userMembership = await this.prisma.userMembership.create({
      data,
      include: {
        membership: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return toUserMembershipEntity(userMembership);
  }

  async getUserMembership(
    userId: string,
    membershipId: string
  ): Promise<UserMembershipEntity | null> {
    const userMembership = await this.prisma.userMembership.findFirst({
      where: {
        userId,
        membershipId,
      },
      include: {
        membership: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return userMembership ? toUserMembershipEntity(userMembership) : null;
  }

  async getUserMembershipsPaginated(
    userId: string,
    options: PaginateOptions & { status?: string; membershipId?: string }
  ): Promise<IPaginate<UserMembershipEntity>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const sort = options.sort || 'desc';
    const sortBy = options.sortBy || 'createdAt';
    const counted = options.counted ?? true;

    // Build where clause
    const where: Prisma.UserMembershipWhereInput = { userId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.membershipId) {
      where.membershipId = options.membershipId;
    }

    // Build orderBy
    const allowedSortFields = ['createdAt', 'startDate', 'endDate', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy: any = { [sortField]: sort };

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute queries
    const [docs, totalDocs] = await Promise.all([
      this.prisma.userMembership.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          membership: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      counted ? this.prisma.userMembership.count({ where }) : Promise.resolve(0),
    ]);

    const mappedDocs = docs.map(toUserMembershipEntity);

    // Calculate pagination metadata
    const totalPages = counted ? Math.ceil(totalDocs / limit) : 0;
    const currentPage = page;
    const nextPage = currentPage < totalPages ? currentPage + 1 : null;
    const previousPage = currentPage > 1 ? currentPage - 1 : null;
    const hasNext = nextPage !== null;
    const hasPrev = previousPage !== null;

    if (counted) {
      return {
        docs: mappedDocs,
        docsCount: mappedDocs.length,
        totalDocs,
        totalPages,
        currentPage,
        nextPage,
        previousPage,
        limit,
        hasNext,
        hasPrev,
      };
    } else {
      return {
        docs: mappedDocs,
        currentPage,
        nextPage,
        previousPage,
        limit,
        hasNext,
        hasPrev,
      };
    }
  }

  async getAllUsersByMembership(
    membershipId: string,
    options: PaginateOptions & { status?: string }
  ): Promise<IPaginate<UserMembershipEntity>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const sort = options.sort || 'desc';
    const sortBy = options.sortBy || 'createdAt';
    const counted = options.counted ?? true;

    // Build where clause
    const where: Prisma.UserMembershipWhereInput = { membershipId };

    if (options.status) {
      where.status = options.status;
    }

    // Build orderBy
    const allowedSortFields = ['createdAt', 'startDate', 'endDate', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy: any = { [sortField]: sort };

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute queries
    const [docs, totalDocs] = await Promise.all([
      this.prisma.userMembership.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          membership: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      counted ? this.prisma.userMembership.count({ where }) : Promise.resolve(0),
    ]);

    const mappedDocs = docs.map(toUserMembershipEntity);

    // Calculate pagination metadata
    const totalPages = counted ? Math.ceil(totalDocs / limit) : 0;
    const currentPage = page;
    const nextPage = currentPage < totalPages ? currentPage + 1 : null;
    const previousPage = currentPage > 1 ? currentPage - 1 : null;
    const hasNext = nextPage !== null;
    const hasPrev = previousPage !== null;

    if (counted) {
      return {
        docs: mappedDocs,
        docsCount: mappedDocs.length,
        totalDocs,
        totalPages,
        currentPage,
        nextPage,
        previousPage,
        limit,
        hasNext,
        hasPrev,
      };
    } else {
      return {
        docs: mappedDocs,
        currentPage,
        nextPage,
        previousPage,
        limit,
        hasNext,
        hasPrev,
      };
    }
  }

  async updateUserMembership(
    userId: string,
    membershipId: string,
    data: Prisma.UserMembershipUpdateInput
  ): Promise<UserMembershipEntity> {
    // First find the user membership to get its ID
    const existing = await this.prisma.userMembership.findFirst({
      where: {
        userId,
        membershipId,
      },
    });

    if (!existing) {
      throw new Error('UserMembership not found');
    }

    const userMembership = await this.prisma.userMembership.update({
      where: {
        id: existing.id,
      },
      data,
      include: {
        membership: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return toUserMembershipEntity(userMembership);
  }

  async removeUserMembership(userId: string, membershipId: string): Promise<void> {
    // First find the user membership to get its ID
    const existing = await this.prisma.userMembership.findFirst({
      where: {
        userId,
        membershipId,
      },
    });

    if (!existing) {
      throw new Error('UserMembership not found');
    }

    await this.prisma.userMembership.delete({
      where: {
        id: existing.id,
      },
    });
  }

  async getUserActiveMembership(userId: string): Promise<UserMembershipEntity | null> {
    const now = new Date();
    const userMembership = await this.prisma.userMembership.findFirst({
      where: {
        userId,
        status: 'normal',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        membership: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return userMembership ? toUserMembershipEntity(userMembership) : null;
  }
}

