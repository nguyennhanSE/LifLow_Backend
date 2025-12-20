import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserPermissionsDto } from '../dto/permissions.dto';

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUserWithPermissions(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        dashboardAccess: true,
        memberAccess: true,
        productAccess: true,
        orderAccess: true,
        recipeAccess: true,
        bannerAccess: true,
        userRole: {
          include: {
            role: true
          }
        }
      }
    });
  }

  async getUserPermissionFlags(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        dashboardAccess: true,
        memberAccess: true,
        productAccess: true,
        orderAccess: true,
        recipeAccess: true,
        bannerAccess: true
      }
    });
  }

  async updateUserPermissions(userId: string, permissions: UserPermissionsDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: permissions,
      select: {
        id: true,
        name: true,
        dashboardAccess: true,
        memberAccess: true,
        productAccess: true,
        orderAccess: true,
        recipeAccess: true,
        bannerAccess: true,
        updatedAt: true
      }
    });
  }

  async userExists(userId: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { id: userId }
    });
    return count > 0;
  }
}

