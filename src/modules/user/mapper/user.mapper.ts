import { UserEntity, RoleInfo, PermissionInfo, MembershipInfo } from '../entities/user.entity';
import { User, UserRole, Role,  Membership, UserMembership } from '@prisma/client';
import { CreateUserDto } from '../dto/user.dto';
import { EPermissions } from '../../permissions/enum/permissions.enum';

type UserWithRelations = User & {
  userRole?: (UserRole & {
    role: Role;
  })[];
  userMembership?: (UserMembership & {
    membership: Membership;
  }) | null;
};

export interface UserMembershipInfo extends MembershipInfo {
  status: string;
  startDate: Date;
  endDate: Date;
  membershipName: string;
  membershipDescription: string;
}

/**
 * Calculate user situation based on dormancyDate and withdrawalDate
 */
export function calculateSituation(
  withdrawalDate: string | null,
  dormancyDate: string | null
): 'Active' | 'Dormant' | 'Withdrawn' {
  if (withdrawalDate) {
    return 'Withdrawn';
  }
  if (dormancyDate) {
    return 'Dormant';
  }
  return 'Active';
}

/**
 * Maps Prisma User model to UserEntity
 */
export function toUserEntity(user: User): UserEntity {
  return {
    id: user.id,
    password: user.password,
    name: user.name ?? '',
    age: user.age,
    membershipLevel: user.membershipLevel,
    email: user.email ?? undefined,
    phoneNumber: user.phoneNumber ?? undefined,
    totalUsedPoints: user.totalUsedPoints ?? undefined,
    availablePoints: user.availablePoints ?? undefined,
    registrationDate: user.registrationDate ?? undefined,
    dormancyDate: user.dormancyDate,
    withdrawalDate: user.withdrawalDate,
    withdrawalType: user.withdrawalType,
    reasonForWithdrawal: user.reasonForWithdrawal,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    situation: calculateSituation(user.withdrawalDate, user.dormancyDate),
    membership: null,
    totalPurchaseAmount: user.totalPurchaseAmount,
  };
}

/**
 * Maps Prisma User with relations (userRole, role, userMembership, membership) to UserEntity
 * Note: Permissions are now boolean flags on the User model, not in a separate table
 */
export function toUserEntityWithRelations(user: UserWithRelations): UserEntity {
  // Extract unique roles
  const roles: RoleInfo[] = [];
  const roleMap = new Map<string, RoleInfo>();
  
  // Build permissions from boolean flags on user using EPermissions enum
  const permissions: PermissionInfo[] = [];
  
  const permissionMapping: Array<{
    flag: boolean | null;
    permission: EPermissions;
    name: string;
    description: string;
  }> = [
    {
      flag: user.dashboardAccess ?? false,
      permission: EPermissions.DASHBOARD_ACCESS,
      name: 'Dashboard Access',
      description: 'Access to dashboard and analytics',
    },
    {
      flag: user.memberAccess ?? false,
      permission: EPermissions.MEMBER_MANAGEMENT,
      name: 'Member Management',
      description: 'Manage member information (view, create, update, delete)',
    },
    {
      flag: user.productAccess ?? false,
      permission: EPermissions.PRODUCT_MANAGEMENT,
      name: 'Product Management',
      description: 'Manage product information (view, create, update, delete)',
    },
    {
      flag: user.orderAccess ?? false,
      permission: EPermissions.ORDER_MANAGEMENT,
      name: 'Order Management',
      description: 'Manage order information (view, create, update, delete)',
    },
    {
      flag: user.recipeAccess ?? false,
      permission: EPermissions.RECIPE_MANAGEMENT,
      name: 'Recipe Management',
      description: 'Manage recipe information (view, create, update, delete)',
    },
    {
      flag: user.bannerAccess ?? false,
      permission: EPermissions.BANNER_MANAGEMENT,
      name: 'Banner Management',
      description: 'Manage banner information (view, create, update, delete)',
    },
  ];

  permissionMapping.forEach(({ flag, permission, name, description }) => {
    if (flag) {
      permissions.push({
        id: permission,
        name,
        description,
      });
    }
  });

  // Extract roles
  if (user.userRole) {
    user.userRole.forEach((userRole) => {
      const role = userRole.role;
      
      // Add role if not already added
      if (!roleMap.has(role.id)) {
        roleMap.set(role.id, {
          id: role.id,
          name: role.name,
          description: role.description,
        });
      }
    });
  }

  return {
    id: user.id,
    password: user.password,
    name: user.name ?? '',
    age: user.age,
    membershipLevel: user.membershipLevel,
    email: user.email ?? undefined,
    phoneNumber: user.phoneNumber ?? undefined,
    totalUsedPoints: user.totalUsedPoints ?? undefined,
    availablePoints: user.availablePoints ?? undefined,
    registrationDate: user.registrationDate ?? undefined,
    dormancyDate: user.dormancyDate,
    withdrawalDate: user.withdrawalDate,
    withdrawalType: user.withdrawalType,
    reasonForWithdrawal: user.reasonForWithdrawal,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: Array.from(roleMap.values()),
    permissions: permissions,
    membership: user.userMembership ? toUserMembershipInfo(user.userMembership) : null,
    situation: calculateSituation(user.withdrawalDate, user.dormancyDate),
    totalPurchaseAmount: user.totalPurchaseAmount ?? 0,
  };
}

/**
 * Maps CreateUserDto to Prisma User create input
 */
export function toPrismaUserCreateInput(dto: CreateUserDto & {password?: string; phoneNumber?: string; id?: string }) {
  const registrationDate = new Date().toISOString().split('T')[0];
  
  return {
    id: dto.id || dto.email.split('@')[0], // Use email prefix as id if not provided
    password: dto.password,
    name: dto.name,
    email: dto.email,
    phoneNumber: dto.phoneNumber || '',
    totalUsedPoints: 0,
    availablePoints: 0,
    registrationDate: registrationDate,
    age: null,
    dormancyDate: null,
    withdrawalDate: null,
    withdrawalType: null,
    reasonForWithdrawal: null,
    totalPurchaseAmount: 0,
  };
}

/**
 * Maps UserMembership with details to enriched membership info
 * This includes status, dates, and denormalized fields
 */
export function toUserMembershipInfo(userMembership: UserMembership & { membership: Membership }): UserMembershipInfo {
  return {
    id: userMembership.membership.id,
    name: userMembership.membership.name ?? '',
    description: userMembership.membership.description,
    status: userMembership.status,
    startDate: userMembership.startDate,
    endDate: userMembership.endDate,
    membershipName: userMembership.membershipName,
    membershipDescription: userMembership.membershipDescription,
  };
}

/**
 * Maps UserEntity to response DTO (excludes sensitive fields)
 */
export function toResponse(entity: UserEntity) {
  const { password, ...rest } = entity;
  return rest;
}

