import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { UserEntity } from "../entities/user.entity";
import { CreateUserDto, UserFilterDto } from "../dto/user.dto";
import { toUserEntity, toPrismaUserCreateInput, toUserEntityWithRelations } from "../mapper/user.mapper";
import { IPaginate, PaginateOptions } from "../../../libs/models/paginate/pagimate.model";
import { Prisma } from "@prisma/client";
import { ERoleName } from "../../roles/enums/role.enum";
import { BadRequestException } from "@nestjs/common";
import { OrderRepository } from "../../order/repositories/order.repository";

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService, private readonly orderRepository: OrderRepository) {}

  async countUsersCreatedBetween(from: Date, toExclusive: Date): Promise<number> {
    return this.prisma.user.count({
      where: {
        createdAt: {
          gte: from,
          lt: toExclusive,
        },
      },
    });
  }

  /**
   * Get user by account (id) with relations
   */
  async getUserByAccount(account: string): Promise<UserEntity | null> {
    // Validate account is not empty or undefined
    if (!account || account.trim() === '') {
      return null;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: account.trim() },
        include: {
          userRole: {
            include: {
              role: true,
            },
          },
          userMembership: {
            include: {
              membership: true,
            },
          },
        },
      });
      if (!user) {
        return null;
      }
      const userEntity = toUserEntityWithRelations(user);
      userEntity.orderNumber = await this.orderRepository.getUserOrderNumber(user.id);
      return userEntity;
    } catch (error) {
      // Log Prisma errors for debugging
      console.error('Prisma error in getUserByAccount:', error);
      throw error;
    }
  }

  /**
   * Get user by email with relations
   */
  async getUserByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        userRole: {
          include: {
            role: true,
          },
        },
        userMembership: {
          include: {
            membership: true,
          },
        },
      },
    });
    if (!user) {
      return null;
    }
    return toUserEntityWithRelations(user);
  }

  /**
   * Create a new user
   */
  async createUser(createUserDto: CreateUserDto & {password?: string; phoneNumber?: string }): Promise<UserEntity> {
    // Default role to USER if not provided
    const roleName = createUserDto.role || ERoleName.USER;

    // Find the role in the database
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new BadRequestException(`Role ${roleName} not found in database`);
    }

    // Create user and assign role in a transaction
    const createdUserId = await this.prisma.$transaction(async (tx) => {
      // Create the user
      const createdUser = await tx.user.create({
        data: toPrismaUserCreateInput(createUserDto),
      });

      // Assign role to user
      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: role.id,
        },
      });

      return createdUser.id;
    });

    // Fetch the created user with all relations
    const userWithRelations = await this.prisma.user.findUnique({
      where: { id: createdUserId },
      include: {
        userRole: {
          include: {
            role: true,
          },
        },
        userMembership: {
          include: {
            membership: true,
          },
        },
      },
    });

    if (!userWithRelations) {
      throw new BadRequestException('Failed to retrieve created user');
    }

    return toUserEntityWithRelations(userWithRelations);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updateData: Partial<UserEntity> & { role?: ERoleName; password?: string }): Promise<UserEntity> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new BadRequestException(`User with id ${userId} not found`);
    }

    // Extract role from update data (handle it separately)
    const { role, ...userData } = updateData;

    // Update user and role in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Update user fields
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(userData as Prisma.UserUpdateInput),
          updatedAt: new Date(),
        },
      });

      // Update role if provided
      if (role) {
        // Find the new role
        const newRole = await tx.role.findUnique({
          where: { name: role },
        });

        if (!newRole) {
          throw new BadRequestException(`Role ${role} not found in database`);
        }

        // Delete existing user roles
        await tx.userRole.deleteMany({
          where: { userId },
        });

        // Assign new role
        await tx.userRole.create({
          data: {
            userId,
            roleId: newRole.id,
          },
        });
      }
    });

    // Fetch the updated user with all relations
    const userWithRelations = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRole: {
          include: {
            role: true,
          },
        },
        userMembership: {
          include: {
            membership: true,
          },
        },
      },
    });

    if (!userWithRelations) {
      throw new BadRequestException('Failed to retrieve updated user');
    }

    return toUserEntityWithRelations(userWithRelations);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new BadRequestException(`User with id ${userId} not found`);
    }

    // Delete user (cascade will handle userRole deletion)
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async getUserPaginate(
    filter: UserFilterDto,
    options: PaginateOptions
  ): Promise<IPaginate<UserEntity>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const sort = options.sort || 'asc';
    const sortBy = options.sortBy || 'createdAt';
    const counted = options.counted ?? true;

    const { q: search, email, searchField, role } = filter;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    // Filter by role
    if (role && role !== 'ALL') {
      where.userRole = {
        some: {
          role: {
            name: role,
          },
        },
      };
    }

    if (email) {
      where.email = email;
    }

    if (search) {
      console.log(`[DEBUG] Searching for: "${search}", searchField: "${searchField || 'none'}"`);
      if (searchField) {
        // Search in specific field
        where[searchField as keyof Prisma.UserWhereInput] = {
          contains: search,
          mode: 'insensitive',
        } as any;
      } else {
        // Search in name or email
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      console.log('[DEBUG] Where clause:', JSON.stringify(where, null, 2));
    }

    // Build orderBy
    const allowedSortFields = ['id', 'name', 'email', 'createdAt', 'updatedAt', 'registrationDate'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    
    // Map sort field to Prisma orderBy
    let orderBy: Prisma.UserOrderByWithRelationInput;
    if (sortField === 'id') {
      orderBy = { id: sort };
    } else if (sortField === 'name') {
      orderBy = { name: sort };
    } else if (sortField === 'email') {
      orderBy = { email: sort };
    } else if (sortField === 'createdAt') {
      orderBy = { createdAt: sort };
    } else if (sortField === 'updatedAt') {
      orderBy = { updatedAt: sort };
    } else if (sortField === 'registrationDate') {
      orderBy = { registrationDate: sort };
    } else {
      orderBy = { createdAt: sort };
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute queries with relations
    // console.log('skip', skip);
    // console.log('limit', limit);
    // console.log('orderBy', orderBy);
    const [docs, totalDocs] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          userRole: {
            include: {
              role: true,
            },
          },
          userMembership: {
            include: {
              membership: true,
            },
          },
        },
      }),
      counted ? this.prisma.user.count({ where }) : Promise.resolve(0),
    ]);

    // Map to entities with relations
    const mappedDocs = docs.map(toUserEntityWithRelations);

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
  async getAdminPaginate(
    filter: UserFilterDto,
    options: PaginateOptions
  ): Promise<IPaginate<UserEntity>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const sort = options.sort || 'asc';
    const sortBy = options.sortBy || 'createdAt';
    const counted = options.counted ?? true;

    const { q: search, email, searchField, role } = filter;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    // Always exclude USER role, regardless of filter (including 'ALL')
    if (role && role !== 'ALL') {
      // Filter by specific role AND exclude USER
      where.AND = [
        {
          userRole: {
            some: {
              role: {
                name: role,
              },
            },
          },
        },
        {
          userRole: {
            none: {
              role: {
                name: ERoleName.USER,
              },
            },
          },
        },
      ];
    } else {
      // If no specific role filter or 'ALL', exclude USER role
      where.userRole = {
        none: {
          role: {
            name: ERoleName.USER,
          },
        },
      };
    }

    if (email) {
      where.email = email;
    }

    if (search) {
      console.log(`[DEBUG] Searching for: "${search}", searchField: "${searchField || 'none'}"`);
      if (searchField) {
        // Search in specific field
        where[searchField as keyof Prisma.UserWhereInput] = {
          contains: search,
          mode: 'insensitive',
        } as any;
      } else {
        // Search in name or email
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      console.log('[DEBUG] Where clause:', JSON.stringify(where, null, 2));
    }

    // Build orderBy
    const allowedSortFields = ['id', 'name', 'email', 'createdAt', 'updatedAt', 'registrationDate'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    
    // Map sort field to Prisma orderBy
    let orderBy: Prisma.UserOrderByWithRelationInput;
    if (sortField === 'id') {
      orderBy = { id: sort };
    } else if (sortField === 'name') {
      orderBy = { name: sort };
    } else if (sortField === 'email') {
      orderBy = { email: sort };
    } else if (sortField === 'createdAt') {
      orderBy = { createdAt: sort };
    } else if (sortField === 'updatedAt') {
      orderBy = { updatedAt: sort };
    } else if (sortField === 'registrationDate') {
      orderBy = { registrationDate: sort };
    } else {
      orderBy = { createdAt: sort };
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute queries with relations
    // console.log('skip', skip);
    // console.log('limit', limit);
    // console.log('orderBy', orderBy);
    const [docs, totalDocs] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          userRole: {
            include: {
              role: true,
            },
          },
          userMembership: {
            include: {
              membership: true,
            },
          },
        },
      }),
      counted ? this.prisma.user.count({ where }) : Promise.resolve(0),
    ]);

    // Map to entities with relations
    const mappedDocs = docs.map(toUserEntityWithRelations);

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

}