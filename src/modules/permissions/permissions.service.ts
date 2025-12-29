import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EPermissions } from './enum/permissions.enum';
import { UserPermissionsDto, BulkUpdatePermissionsDto, CheckPermissionDto } from './dto/permissions.dto';
import { PermissionsRepository } from './repositories/permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  /**
   * Maps EPermissions enum values to User model boolean fields
   */
  private readonly permissionMap: Record<keyof UserPermissionsDto, EPermissions> = {
    [EPermissions.DASHBOARD_ACCESS]: EPermissions.DASHBOARD_ACCESS,
    [EPermissions.MEMBER_MANAGEMENT]: EPermissions.MEMBER_MANAGEMENT,
    [EPermissions.PRODUCT_MANAGEMENT]: EPermissions.PRODUCT_MANAGEMENT,
    [EPermissions.ORDER_MANAGEMENT]: EPermissions.ORDER_MANAGEMENT,
    [EPermissions.RECIPE_MANAGEMENT]: EPermissions.RECIPE_MANAGEMENT,
    [EPermissions.BANNER_MANAGEMENT]: EPermissions.BANNER_MANAGEMENT,
  };

  /**
   * Reverse map: User boolean field to EPermissions enum
   */
  private readonly fieldToPermissionMap: Record<EPermissions, keyof UserPermissionsDto> = {
    [EPermissions.DASHBOARD_ACCESS]: EPermissions.DASHBOARD_ACCESS,
    [EPermissions.MEMBER_MANAGEMENT]: EPermissions.MEMBER_MANAGEMENT,
    [EPermissions.PRODUCT_MANAGEMENT]: EPermissions.PRODUCT_MANAGEMENT,
    [EPermissions.ORDER_MANAGEMENT]: EPermissions.ORDER_MANAGEMENT,
    [EPermissions.RECIPE_MANAGEMENT]: EPermissions.RECIPE_MANAGEMENT,
    [EPermissions.BANNER_MANAGEMENT]: EPermissions.BANNER_MANAGEMENT,
  };

  /**
   * Get all available permissions from EPermissions enum
   */
  getAllPermissions() {
    const permissions = Object.values(EPermissions).map(key => {
      return {
        key,
        name: this.getPermissionDisplayName(key),
        description: this.getPermissionDescription(key),
        category: this.getPermissionCategory(key),
      };
    });

    const categories = [...new Set(permissions.map(p => p.category))];

    return { permissions, categories };
  }

  /**
   * Get display name for a permission
   */
  private getPermissionDisplayName(permission: EPermissions): string {
    const displayNames: Record<EPermissions, string> = {
      [EPermissions.DASHBOARD_ACCESS]: 'Dashboard Access',
      [EPermissions.MEMBER_MANAGEMENT]: 'Member Management',
      [EPermissions.PRODUCT_MANAGEMENT]: 'Product Management',
      [EPermissions.ORDER_MANAGEMENT]: 'Order Management',
      [EPermissions.RECIPE_MANAGEMENT]: 'Recipe Management',
      [EPermissions.BANNER_MANAGEMENT]: 'Banner Management',
    };
    return displayNames[permission] || permission;
  }

  /**
   * Get description for a permission
   */
  private getPermissionDescription(permission: EPermissions): string {
    const descriptions: Record<EPermissions, string> = {
      [EPermissions.DASHBOARD_ACCESS]: 'Access to dashboard and analytics',
      [EPermissions.MEMBER_MANAGEMENT]: 'Manage member information (view, create, update, delete)',
      [EPermissions.PRODUCT_MANAGEMENT]: 'Manage product information (view, create, update, delete)',
      [EPermissions.ORDER_MANAGEMENT]: 'Manage order information (view, create, update, delete)',
      [EPermissions.RECIPE_MANAGEMENT]: 'Manage recipe information (view, create, update, delete)',
      [EPermissions.BANNER_MANAGEMENT]: 'Manage banner information (view, create, update, delete)',
    };
    return descriptions[permission] || '';
  }

  /**
   * Get category for a permission (e.g., "DASHBOARD", "MEMBER", "PRODUCT")
   */
  private getPermissionCategory(permission: EPermissions): string {
    if (permission === EPermissions.DASHBOARD_ACCESS) {
      return 'DASHBOARD';
    }
    // Extract category from permission (e.g., MEMBER_MANAGEMENT -> MEMBER)
    return permission.split('_')[0];
  }

  getPermissionEnum() {
    return { enum: EPermissions };
  }

  /**
   * Get user permissions mapped to EPermissions enum
   */
  async getUserPermissions(userId: string) {
    const user = await this.permissionsRepository.getUserWithPermissions(userId);

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const roles = user.userRole.map(ur => ur.role.name);

    // Map boolean flags to EPermissions array
    const permissions: EPermissions[] = [];
    if (user.dashboardAccess) permissions.push(EPermissions.DASHBOARD_ACCESS);
    if (user.memberAccess) permissions.push(EPermissions.MEMBER_MANAGEMENT);
    if (user.productAccess) permissions.push(EPermissions.PRODUCT_MANAGEMENT);
    if (user.orderAccess) permissions.push(EPermissions.ORDER_MANAGEMENT);
    if (user.recipeAccess) permissions.push(EPermissions.RECIPE_MANAGEMENT);
    if (user.bannerAccess) permissions.push(EPermissions.BANNER_MANAGEMENT);

    return {
      userId: user.id,
      userName: user.name,
      permissions,
      permissionsFlags: {
        dashboardAccess: user.dashboardAccess,
        memberAccess: user.memberAccess,
        productAccess: user.productAccess,
        orderAccess: user.orderAccess,
        recipeAccess: user.recipeAccess,
        bannerAccess: user.bannerAccess
      },
      roles
    };
  }

  /**
   * Update user permissions using boolean flags
   */
  async updateUserPermissions(userId: string, permissionsDto: UserPermissionsDto) {
    // Verify user exists
    const userExists = await this.permissionsRepository.userExists(userId);
    if (!userExists) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Validate permission keys
    const validKeys: Array<EPermissions> = [EPermissions.DASHBOARD_ACCESS, EPermissions.MEMBER_MANAGEMENT, EPermissions.PRODUCT_MANAGEMENT, EPermissions.ORDER_MANAGEMENT, EPermissions.RECIPE_MANAGEMENT, EPermissions.BANNER_MANAGEMENT];
    const providedKeys = Object.keys(permissionsDto) as Array<EPermissions>;
    const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      throw new BadRequestException(`Invalid permission keys: ${invalidKeys.join(', ')}`);
    }

    // Update permissions
    const updated = await this.permissionsRepository.updateUserPermissions(userId, permissionsDto);

    // Map boolean flags to EPermissions array
    const permissions: EPermissions[] = [];
    if (updated.dashboardAccess) permissions.push(EPermissions.DASHBOARD_ACCESS);
    if (updated.memberAccess) permissions.push(EPermissions.MEMBER_MANAGEMENT);
    if (updated.productAccess) permissions.push(EPermissions.PRODUCT_MANAGEMENT);
    if (updated.orderAccess) permissions.push(EPermissions.ORDER_MANAGEMENT);
    if (updated.recipeAccess) permissions.push(EPermissions.RECIPE_MANAGEMENT);
    if (updated.bannerAccess) permissions.push(EPermissions.BANNER_MANAGEMENT);

    return {
      userId: updated.id,
      userName: updated.name,
      permissions,
      permissionsFlags: {
        dashboardAccess: updated.dashboardAccess,
        memberAccess: updated.memberAccess,
        productAccess: updated.productAccess,
        orderAccess: updated.orderAccess,
        recipeAccess: updated.recipeAccess,
        bannerAccess: updated.bannerAccess
      },
      updatedAt: updated.updatedAt
    };
  }

  async bulkUpdatePermissions(bulkDto: BulkUpdatePermissionsDto) {
    const results: any[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const item of bulkDto.users) {
      try {
        await this.updateUserPermissions(item.userId, item.permissions);
        results.push({
          userId: item.userId,
          status: 'success',
          updatedFields: Object.keys(item.permissions)
        });
        successCount++;
      } catch (error: any) {
        results.push({
          userId: item.userId,
          status: 'failure',
          error: error.message
        });
        failureCount++;
      }
    }

    return {
      totalUsers: bulkDto.users.length,
      successCount,
      failureCount,
      results
    };
  }

  /**
   * Check if user has a specific permission
   */
  async checkPermission(checkDto: CheckPermissionDto) {
    const { userId, permission } = checkDto;

    // Verify user exists and get permission flags
    const user = await this.permissionsRepository.getUserPermissionFlags(userId);

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Map permission enum to boolean field
    const field = this.permissionMap[permission];
    if (!field) {
      throw new BadRequestException(`Permission mapping not found for: ${permission}`);
    }

    const hasPermission = user[this.fieldToPermissionMap[field]];

    return {
      userId,
      permission,
      hasPermission: Boolean(hasPermission),
      grantedVia: 'direct'
    };
  }

  /**
   * Check if user has any of the required permissions
   * This is used by the PermissionsGuard
   */
  async userHasPermission(userId: string, requiredPermission: EPermissions): Promise<boolean> {
    const user = await this.permissionsRepository.getUserPermissionFlags(userId);
    
    if (!user) {
      return false;
    }

    const field = this.permissionMap[requiredPermission];
    if (!field) {
      return false;
    }

    return Boolean(user[this.fieldToPermissionMap[field]]);
  }

  /**
   * Check if user has all of the required permissions
   */
  async userHasAllPermissions(userId: string, requiredPermissions: EPermissions[]): Promise<boolean> {
    if (requiredPermissions.length === 0) {
      return true;
    }

    const checks = await Promise.all(
      requiredPermissions.map(permission => this.userHasPermission(userId, permission))
    );

    return checks.every(hasPermission => hasPermission);
  }

  /**
   * Check if user has any of the required permissions
   */
  async userHasAnyPermission(userId: string, requiredPermissions: EPermissions[]): Promise<boolean> {
    if (requiredPermissions.length === 0) {
      return true;
    }

    const checks = await Promise.all(
      requiredPermissions.map(permission => this.userHasPermission(userId, permission))
    );

    return checks.some(hasPermission => hasPermission);
  }
}
