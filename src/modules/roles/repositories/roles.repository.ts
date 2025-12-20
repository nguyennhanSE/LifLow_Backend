import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Role, Prisma } from '@prisma/client';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.RoleCreateInput): Promise<Role> {
    return this.prisma.role.create({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.RoleWhereInput;
    orderBy?: Prisma.RoleOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    
    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          _count: {
            select: { userRole: true }
          }
        }
      }),
      this.prisma.role.count({ where })
    ]);

    return { roles, total };
  }

  async findOne(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        userRole: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { name } });
  }

  async update(id: string, data: Prisma.RoleUpdateInput): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<Role> {
    return this.prisma.role.delete({ where: { id } });
  }

  async assignRoleToUsers(roleId: string, userIds: string[]) {
    return this.prisma.userRole.createMany({
      data: userIds.map(userId => ({ userId, roleId })),
      skipDuplicates: true
    });
  }

  async revokeRoleFromUser(roleId: string, userId: string) {
    return this.prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId }
      }
    });
  }

  async getUsersByRole(roleId: string, skip?: number, take?: number, search?: string) {
    const where: Prisma.UserRoleWhereInput = {
      roleId,
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }
      })
    };

    const [userRoles, total] = await Promise.all([
      this.prisma.userRole.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true
            }
          }
        }
      }),
      this.prisma.userRole.count({ where })
    ]);

    return { userRoles, total };
  }
}

