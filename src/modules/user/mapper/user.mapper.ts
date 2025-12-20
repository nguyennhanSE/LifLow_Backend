import { UserEntity, RoleInfo, PermissionInfo, MembershipInfo } from '../entities/user.entity';
import { User, UserRole, Role,  Membership, UserMembership } from '@prisma/client';
import { CreateUserDto } from '../dto/user.dto';

type UserWithRelations = User & {
  userRole?: (UserRole & {
    role: Role;
  })[];
  userMembership?: (UserMembership & {
    membership: Membership;
  })[];
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
    name: user.name,
    age: user.age,
    membershipLevel: user.membershipLevel,
    email: user.email,
    phoneNumber: user.phoneNumber,
    totalUsedPoints: user.totalUsedPoints,
    availablePoints: user.availablePoints,
    registrationDate: user.registrationDate,
    dormancyDate: user.dormancyDate,
    withdrawalDate: user.withdrawalDate,
    withdrawalType: user.withdrawalType,
    reasonForWithdrawal: user.reasonForWithdrawal,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    situation: calculateSituation(user.withdrawalDate, user.dormancyDate),
    memberships: [],
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
  
  // Build permissions from boolean flags on user
  const permissions: PermissionInfo[] = [];
  
  if (user.dashboardAccess) {
    permissions.push({
      id: 'dashboard',
      name: 'Dashboard Access',
      description: 'Access to dashboard and analytics',
    });
  }
  if (user.memberAccess) {
    permissions.push({
      id: 'member',
      name: 'Member Management',
      description: 'Access to member management',
    });
  }
  if (user.productAccess) {
    permissions.push({
      id: 'product',
      name: 'Product Management',
      description: 'Access to product management',
    });
  }
  if (user.orderAccess) {
    permissions.push({
      id: 'order',
      name: 'Order Management',
      description: 'Access to order management',
    });
  }
  if (user.recipeAccess) {
    permissions.push({
      id: 'recipe',
      name: 'Recipe Management',
      description: 'Access to recipe management',
    });
  }
  if (user.bannerAccess) {
    permissions.push({
      id: 'banner',
      name: 'Banner Management',
      description: 'Access to banner management',
    });
  }

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

  // Extract memberships
  const memberships: MembershipInfo[] = [];
  if (user.userMembership) {
    user.userMembership.forEach((userMembership) => {
      const membership = userMembership.membership;
      
      // Add membership with basic info
      memberships.push({
        id: membership.id,
        name: membership.name,
        description: membership.description,
      });
    });
  }

  return {
    id: user.id,
    password: user.password,
    name: user.name,
    age: user.age,
    membershipLevel: user.membershipLevel,
    email: user.email,
    phoneNumber: user.phoneNumber,
    totalUsedPoints: user.totalUsedPoints,
    availablePoints: user.availablePoints,
    registrationDate: user.registrationDate,
    dormancyDate: user.dormancyDate,
    withdrawalDate: user.withdrawalDate,
    withdrawalType: user.withdrawalType,
    reasonForWithdrawal: user.reasonForWithdrawal,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: Array.from(roleMap.values()),
    permissions: permissions,
    memberships: memberships,
    situation: calculateSituation(user.withdrawalDate, user.dormancyDate),
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
  };
}

/**
 * Maps UserMembership with details to enriched membership info
 * This includes status, dates, and denormalized fields
 */
export function toUserMembershipInfo(userMembership: UserMembership & { membership: Membership }): UserMembershipInfo {
  return {
    id: userMembership.membership.id,
    name: userMembership.membership.name,
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

