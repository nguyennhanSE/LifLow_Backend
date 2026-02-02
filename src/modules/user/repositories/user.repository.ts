import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { UserEntity } from "../entities/user.entity";
import { CreateUserDto, UpdateShippingAddressDto, UserFilterDto } from "../dto/user.dto";
import { toUserEntity, toPrismaUserCreateInput, toUserEntityWithRelations, toUserInfoResponse } from "../mapper/user.mapper";
import { IPaginate, PaginateOptions } from "../../../libs/models/paginate/pagimate.model";
import { Prisma, User } from "@prisma/client";
import { ERoleName } from "../../roles/enums/role.enum";
import { BadRequestException } from "@nestjs/common";
import { OrderRepository } from "../../order/repositories/order.repository";
import { toOrderGroupResponseDto, toOrderGroupEntityWithRelations } from "../../order/mapper/order.mapper";
import { OrderGroupResponseDto } from "../../order/dto/order.dto";
import { EOrderSituation } from "src/modules/order/enum/order.enum";

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
  async createUser(createUserDto: CreateUserDto & {password?: string; phoneNumber?: string; avatarImageUrl?: string; membershipLevel?: string }): Promise<UserEntity> {
    // Default role to USER if not provided
    const roleName = ERoleName.USER;

    // Find the role in the database
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new BadRequestException(`Role ${roleName} not found in database`);
    }

    // Create user, assign role, and create shipping address in a transaction
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

      // Create shipping address if address information is provided
      if (createUserDto.zipCode && createUserDto.addressName && createUserDto.addressFull) {
        await tx.userShippingAddress.create({
          data: {
            userId: createdUser.id,
            recipientName: createUserDto.name,
            deliveryAddress: createUserDto.addressName,
            address: createUserDto.addressName,
            addressFull: createUserDto.addressFull,
            postalCode: createUserDto.zipCode,
            mobilePhone: createUserDto.mobilePhoneNumber || undefined,
            phoneNumber: createUserDto.phoneNumber || '',
            setAsDefault: true, // Set as default address for new user
          },
        });
      }

      // Create user membership (e.g. LV1. 씨앗) when membershipLevel is provided
      if (createUserDto.membershipLevel) {
        const membership = await tx.membership.findFirst({
          where: { name: createUserDto.membershipLevel },
        });
        if (!membership) {
          throw new BadRequestException(
            `Membership "${createUserDto.membershipLevel}" not found. Please run membership seed first.`,
          );
        }
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(
          endDate.getFullYear() + (membership.basePeriod ? Math.floor(membership.basePeriod / 365) : 1),
        );
        await tx.userMembership.create({
          data: {
            userId: createdUser.id,
            membershipId: membership.id,
            membershipName: membership.name ?? '',
            membershipDescription: membership.description ?? '',
            status: 'normal',
            startDate,
            endDate,
          },
        });
      }

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

    const { q: search, email, searchField, role, status, nickName } = filter;

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

    // Filter by membership status and/or nickName
    if (status || nickName) {
      where.userMembership = {};
      if (status) {
        where.userMembership.status = status;
      }
      if (nickName) {
        where.userMembership.membership = {
          nickName: {
            contains: nickName,
            mode: 'insensitive',
          },
        };
      }
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
    orderBy = { totalPurchaseAmount: 'desc' };
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

    const { q: search, email, searchField, role, status, nickName } = filter;

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

    // Filter by membership status and/or nickName
    if (status || nickName) {
      where.userMembership = {};
      if (status) {
        where.userMembership.status = status;
      }
      if (nickName) {
        where.userMembership.membership = {
          nickName: {
            contains: nickName,
            mode: 'insensitive',
          },
        };
      }
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

  /**
   * Get user points
   */
  async getUserPoints(userId: string) {
    try {
      // Get user information
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          age: true,
          membershipLevel: true,
          totalUsedPoints: true,
          availablePoints: true,
          registrationDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get all points records
      const points = await this.prisma.point.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        user,
        points,
      };
    } catch (error) {
      console.error('Prisma error in getUserPoints:', error);
      throw error;
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(userId: string, options: {
    includeOrders?: boolean;
    includePermissions?: boolean;
    includeMembership?: boolean;
    includePoint?: boolean;
    includeCarts?: boolean;
    includePayments?: boolean;
    includeProductReviews?: boolean;
    includeProductInquiries?: boolean;
    includeCouponHistories?: boolean;
    includeRecipes?: boolean;
  }): Promise<UserEntity> {
    try {
      const include: Prisma.UserInclude = {};

      if (options.includePermissions) {
        include.userRole = {
          include: {
            role: true,
          },
        };
      }

      if (options.includeMembership) {
        include.userMembership = {
          include: {
            membership: true,
          },
        };
        
      }

      if (options.includePoint) {
        include.point = true;
      }

      if (options.includeOrders) {
        include.orderGroups = {
          where: { situation: { not: { in: [EOrderSituation.ORDER_PAYMENT_FAILED, EOrderSituation.ORDER_PAYMENT_PENDING] } } }, 
          include: { orders: true },
          orderBy: { createdAt: 'desc' },
        };
      }

      if (options.includeCarts) {
        include.carts = true;
      }

      if (options.includePayments) {
        include.payments = true;
      }

      if (options.includeProductReviews) {
        include.productReviews = true;
      }

      if (options.includeProductInquiries) {
        include.productInquiries = true;
      }

      if (options.includeCouponHistories) {
        include.couponHistories = true;
      }

      if (options.includeRecipes) {
        include.recipes = {
          include : {recipeComments : true}
        }
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: Object.keys(include).length > 0 ? include : undefined,
      });

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      // Normalize data: ensure included relations return null/[] if no data exists
      // Prisma already returns null for one-to-one and [] for one-to-many when no data,
      // but we ensure it's explicitly set for consistency
      const userWithRelations = user as any;

      // Normalize one-to-one relations (should be null if no data)
      if (options.includeMembership) {
        if (!userWithRelations.userMembership) {
          userWithRelations.userMembership = null;
        } else if (userWithRelations.userMembership?.membership) {
          userWithRelations.membership = userWithRelations.userMembership.membership;
          delete userWithRelations.userMembership;
        } else {
          userWithRelations.membership = null;
          delete userWithRelations.userMembership;
        }
      }

      // Normalize one-to-many relations (should be [] if no data)
      if (options.includePermissions) {
        userWithRelations.userRole = userWithRelations.userRole ?? [];
      }

      if (options.includePoint) {
        userWithRelations.point = userWithRelations.point ?? [];
      }

      if (options.includeOrders) {
        userWithRelations.orderGroups = userWithRelations.orderGroups ?? [];
      }

      if (options.includeCarts) {
        userWithRelations.carts = userWithRelations.carts ?? [];
      }

      if (options.includePayments) {
        userWithRelations.payments = userWithRelations.payments ?? [];
      }

      if (options.includeProductReviews) {
        userWithRelations.productReviews = userWithRelations.productReviews ?? [];
      }

      if (options.includeProductInquiries) {
        userWithRelations.productInquiries = userWithRelations.productInquiries ?? [];
      }

      if (options.includeCouponHistories) {
        userWithRelations.couponHistories = userWithRelations.couponHistories ?? [];
      }

      if (options.includeRecipes) {
        userWithRelations.recipes = userWithRelations.recipes ?? [];
      }

      return toUserInfoResponse(userWithRelations);
    } catch (error) {
      console.error('Prisma error in getUserInfo:', error);
      throw error;
    }
  }

  /**
   * Get user order groups with pagination and product details (grouped by orderGroupNumber)
   */
  async getUserOrders(userId: string, pagination: { offset: number; limit: number }): Promise<{
    orderGroups: OrderGroupResponseDto[];
    total: number;
    offset: number;
    limit: number;
  }> {
    try {
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      // Get order groups with orders and product details, grouped by orderGroupNumber
      const [orderGroups, total] = await Promise.all([
        this.prisma.orderGroup.findMany({
          where: { ordererId: userId },
          include: {
            user: true,
            orders: {
              include: {
                product: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: pagination.offset,
          take: pagination.limit,
        }),
        this.prisma.orderGroup.count({
          where: { ordererId: userId },
        }),
      ]);

      // Map to response DTOs
      const orderGroupDtos = orderGroups.map(orderGroup => {
        const orderGroupEntity = toOrderGroupEntityWithRelations(orderGroup);
        return toOrderGroupResponseDto(orderGroupEntity);
      });

      return {
        orderGroups: orderGroupDtos,
        total,
        offset: pagination.offset,
        limit: pagination.limit,
      };
    } catch (error) {
      console.error('Prisma error in getUserOrders:', error);
      throw error;
    }
  }

  /**
   * Get user shipping address (only one address per user due to unique constraint)
   */
  async getUserShippingAddresses(userId: string): Promise<any[]> {
    try {
      return await this.prisma.userShippingAddress.findMany({
        where: { userId },
        orderBy: [
          { setAsDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    } catch (error) {
      console.error('Prisma error in getUserShippingAddresses:', error);
      throw error;
    }
  }

  /**
   * Create user shipping address
   */
  async createUserShippingAddress(userId: string, addressData: {
    deliveryAddress: string;
    recipientName: string;
    mobilePhone?: string;
    phoneNumber?: string;
    postalCode: number;
    address: string;
    addressFull: string;
    setAsDefault?: boolean;
  }): Promise<any> {
    try {
      // Prepare data for database
      const { phoneNumber, setAsDefault, ...restData } = addressData;
      const isDefault = setAsDefault ?? false;
      
      const dbData = {
        ...restData,
        phoneNumber: phoneNumber || '', // Default to empty string if not provided
        setAsDefault: isDefault,
      };
      
      // If setting as default, update all existing addresses to setAsDefault = false
      if (isDefault) {
        await this.prisma.userShippingAddress.updateMany({
          where: { 
            userId,
            setAsDefault: true,
          },
          data: {
            setAsDefault: false,
          },
        });
      }

      // Create new address
      return await this.prisma.userShippingAddress.create({
        data: {
          ...dbData,
          userId,
        },
      });
    } catch (error) {
      console.error('Prisma error in createUserShippingAddress:', error);
      throw error;
    }
  }

  /**
   * Delete user shipping address by id (scoped to user)
   */
  async deleteUserShippingAddress(userId: string, addressId: string): Promise<{ message: string }> {
    try {
      const existing = await this.prisma.userShippingAddress.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!existing) {
        throw new NotFoundException('Shipping address not found');
      }

      await this.prisma.userShippingAddress.delete({
        where: { id: addressId },
      });

      // If the deleted address was default, set another address as default (latest created)
      if (existing.setAsDefault) {
        const nextDefault = await this.prisma.userShippingAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (nextDefault) {
          await this.prisma.userShippingAddress.update({
            where: { id: nextDefault.id },
            data: { setAsDefault: true },
          });
        }
      }

      return { message: 'Shipping address deleted successfully' };
    } catch (error) {
      console.error('Prisma error in deleteUserShippingAddress:', error);
      throw error;
    }
  }

  /**
   * Update user shipping address by id (scoped to user)
   */
  async updateUserShippingAddress(
    userId: string,
    addressId: string,
    updateData: UpdateShippingAddressDto
  ): Promise<any> {
    try {
      const existing = await this.prisma.userShippingAddress.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!existing) {
        throw new NotFoundException('Shipping address not found');
      }

      // If setting as default, unset other defaults first
      if (updateData.setAsDefault === true) {
        await this.prisma.userShippingAddress.updateMany({
          where: {
            userId,
            setAsDefault: true,
            NOT: { id: addressId },
          },
          data: { setAsDefault: false },
        });
      }

      return await this.prisma.userShippingAddress.update({
        where: { id: addressId },
        data: {
          ...(updateData.deliveryAddress !== undefined ? { deliveryAddress: updateData.deliveryAddress } : {}),
          ...(updateData.recipientName !== undefined ? { recipientName: updateData.recipientName } : {}),
          ...(updateData.mobilePhone !== undefined ? { mobilePhone: updateData.mobilePhone } : {}),
          ...(updateData.phoneNumber !== undefined ? { phoneNumber: updateData.phoneNumber } : {}),
          ...(updateData.postalCode !== undefined ? { postalCode: updateData.postalCode } : {}),
          ...(updateData.address !== undefined ? { address: updateData.address } : {}),
          ...(updateData.addressFull !== undefined ? { addressFull: updateData.addressFull } : {}),
          ...(updateData.setAsDefault !== undefined ? { setAsDefault: updateData.setAsDefault } : {}),
        },
      });
    } catch (error) {
      console.error('Prisma error in updateUserShippingAddress:', error);
      throw error;
    }
  }

  /**
   * Get user by email and name
   */
  async getUserByEmailAndName(email: string, name: string): Promise<UserEntity | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email: email.trim(),
          name: name.trim(),
        },
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
    } catch (error) {
      console.error('Prisma error in getUserByEmailAndName:', error);
      throw error;
    }
  }

  /**
   * Get user by ID, name and email (for password reset verification)
   */
  async getUserByIdNameAndEmail(id: string, name: string, email: string): Promise<UserEntity | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: id.trim(),
          name: name.trim(),
          email: email.trim(),
        },
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
    } catch (error) {
      console.error('Prisma error in getUserByIdNameAndEmail:', error);
      throw error;
    }
  }
}