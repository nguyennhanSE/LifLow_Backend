import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EPermissions } from './enum/permissions.enum';
import { UserPermissionsDto, BulkUpdatePermissionsDto, CheckPermissionDto } from './dto/permissions.dto';
import { PermissionsRepository } from './repositories/permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  private readonly permissionMap = {
    [EPermissions.DASHBOARD_ACCESS]: 'dashboardAccess',
    [EPermissions.MEMBER_MANAGEMENT_READ]: 'memberAccess',
    [EPermissions.MEMBER_MANAGEMENT_WRITE]: 'memberAccess',
    [EPermissions.MEMBER_MANAGEMENT_DELETE]: 'memberAccess',
    [EPermissions.PRODUCT_MANAGEMENT_READ]: 'productAccess',
    [EPermissions.PRODUCT_MANAGEMENT_WRITE]: 'productAccess',
    [EPermissions.PRODUCT_MANAGEMENT_DELETE]: 'productAccess',
    [EPermissions.ORDER_MANAGEMENT_READ]: 'orderAccess',
    [EPermissions.ORDER_MANAGEMENT_WRITE]: 'orderAccess',
    [EPermissions.ORDER_MANAGEMENT_DELETE]: 'orderAccess',
    [EPermissions.RECIPE_MANAGEMENT_READ]: 'recipeAccess',
    [EPermissions.RECIPE_MANAGEMENT_WRITE]: 'recipeAccess',
    [EPermissions.RECIPE_MANAGEMENT_DELETE]: 'recipeAccess',
    [EPermissions.BANNER_MANAGEMENT_READ]: 'bannerAccess',
    [EPermissions.BANNER_MANAGEMENT_WRITE]: 'bannerAccess',
    [EPermissions.BANNER_MANAGEMENT_DELETE]: 'bannerAccess',
  };

  getAllPermissions() {
    const permissions = Object.values(EPermissions).map(key => {
      const category = key.split('_').slice(0, -1).join('_');
      return {
        key,
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: this.getPermissionDescription(key),
        category
      };
    });

    const categories = [...new Set(permissions.map(p => p.category))];

    return { permissions, categories };
  }

  private getPermissionDescription(permission: string): string {
    const descriptions: Record<string, string> = {
      [EPermissions.DASHBOARD_ACCESS]: 'Access to dashboard and analytics',
      [EPermissions.MEMBER_MANAGEMENT_READ]: 'View member information',
      [EPermissions.MEMBER_MANAGEMENT_WRITE]: 'Create and update member information',
      [EPermissions.MEMBER_MANAGEMENT_DELETE]: 'Delete member information',
      [EPermissions.PRODUCT_MANAGEMENT_READ]: 'View product information',
      [EPermissions.PRODUCT_MANAGEMENT_WRITE]: 'Create and update product information',
      [EPermissions.PRODUCT_MANAGEMENT_DELETE]: 'Delete product information',
      [EPermissions.ORDER_MANAGEMENT_READ]: 'View order information',
      [EPermissions.ORDER_MANAGEMENT_WRITE]: 'Create and update order information',
      [EPermissions.ORDER_MANAGEMENT_DELETE]: 'Delete order information',
      [EPermissions.RECIPE_MANAGEMENT_READ]: 'View recipe information',
      [EPermissions.RECIPE_MANAGEMENT_WRITE]: 'Create and update recipe information',
      [EPermissions.RECIPE_MANAGEMENT_DELETE]: 'Delete recipe information',
      [EPermissions.BANNER_MANAGEMENT_READ]: 'View banner information',
      [EPermissions.BANNER_MANAGEMENT_WRITE]: 'Create and update banner information',
      [EPermissions.BANNER_MANAGEMENT_DELETE]: 'Delete banner information',
    };
    return descriptions[permission] || '';
  }

  getPermissionEnum() {
    return { enum: EPermissions };
  }

  async getUserPermissions(userId: string) {
    const user = await this.permissionsRepository.getUserWithPermissions(userId);

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const roles = user.userRole.map(ur => ur.role.name);

    return {
      userId: user.id,
      userName: user.name,
      permissions: {
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

  async updateUserPermissions(userId: string, permissionsDto: UserPermissionsDto) {
    // Verify user exists
    const userExists = await this.permissionsRepository.userExists(userId);
    if (!userExists) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Validate permission keys
    const validKeys = ['dashboardAccess', 'memberAccess', 'productAccess', 'orderAccess', 'recipeAccess', 'bannerAccess'];
    const providedKeys = Object.keys(permissionsDto);
    const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      throw new BadRequestException(`Invalid permission keys: ${invalidKeys.join(', ')}`);
    }

    // Update permissions
    const updated = await this.permissionsRepository.updateUserPermissions(userId, permissionsDto);

    return {
      userId: updated.id,
      userName: updated.name,
      updatedPermissions: {
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

  async checkPermission(checkDto: CheckPermissionDto) {
    const { userId, permission } = checkDto;

    // Verify user exists and get permission flags
    const user = await this.permissionsRepository.getUserPermissionFlags(userId);

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Map permission enum to boolean field
    const field = this.permissionMap[permission as EPermissions];
    if (!field) {
      throw new BadRequestException(`Invalid permission: ${permission}`);
    }

    const hasPermission = user[field as keyof typeof user];

    return {
      userId,
      permission,
      hasPermission,
      grantedVia: 'direct'
    };
  }
}
