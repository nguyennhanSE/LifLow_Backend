import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CreateRoleDto, UpdateRoleDto, RoleQueryDto, AssignRolesToUserDto } from './dto/roles.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { RolesRepository } from './repositories/roles.repository';
import { ERoleName } from './enums/role.enum';

const SYSTEM_ROLES = [ERoleName.ADMIN, ERoleName.USER];

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesRepository: RolesRepository
  ) {}

  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur) => ur.role.name);
  }

  async create(createRoleDto: CreateRoleDto): Promise<any> {
    const { name, description } = createRoleDto;
    
    // Convert to uppercase
    const upperName = name.toUpperCase();
    
    // Check if role already exists
    const existing = await this.rolesRepository.findByName(upperName);
    if (existing) {
      throw new ConflictException(`Role with name '${upperName}' already exists`);
    }

    return this.rolesRepository.create({
      name: upperName,
      description
    });
  }

  async findAll(query: RoleQueryDto): Promise<any> {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    const orderBy = { [sortBy]: sortOrder };

    const { roles, total } = await this.rolesRepository.findAll({
      skip,
      take: limit,
      where,
      orderBy
    });

    return {
      items: roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        userCount: (role as any)._count?.userRole || 0,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string): Promise<any> {
    const role = await this.rolesRepository.findOne(id);
    
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    const userRoles = (role as any).userRole || [];
    
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: userRoles.length,
      users: userRoles.map((ur: any) => ({
        id: ur.user.id,
        name: ur.user.name,
        email: ur.user.email,
        assignedAt: ur.createdAt
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    };
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<any> {
    const role = await this.rolesRepository.findOne(id);
    
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    // Prevent updating system roles
    if (SYSTEM_ROLES.includes(role.name.toUpperCase() as ERoleName)) {
      throw new BadRequestException(`Cannot update system role '${role.name}'`);
    }

    // If name is being changed, check for duplicates
    if (updateRoleDto.name) {
      const upperName = updateRoleDto.name.toUpperCase();
      if (upperName !== role.name) {
        const existing = await this.rolesRepository.findByName(upperName);
        if (existing) {
          throw new ConflictException(`Role with name '${upperName}' already exists`);
        }
        updateRoleDto.name = upperName;
      }
    }

    return this.rolesRepository.update(id, updateRoleDto);
  }

  async remove(id: string, force: boolean = false): Promise<any> {
    const role = await this.rolesRepository.findOne(id);
    
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    // Prevent deleting system roles
    if (SYSTEM_ROLES.includes(role.name.toUpperCase() as ERoleName)) {
      throw new BadRequestException(`Cannot delete system role '${role.name}'`);
    }

    // Check if role has assigned users
    const userCount = (role as any).userRole?.length || 0;
    if (userCount > 0 && !force) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because it has ${userCount} assigned user(s). Use force=true to unassign and delete.`
      );
    }

    // If force is true, delete user roles first (cascade will handle this automatically)
    return this.rolesRepository.delete(id);
  }

  async assignRoleToUsers(roleId: string, assignDto: AssignRolesToUserDto): Promise<any> {
    const { userIds } = assignDto;

    // Verify role exists
    const role = await this.rolesRepository.findOne(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' not found`);
    }

    // Verify all users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } }
    });

    if (users.length !== userIds.length) {
      const foundIds = users.map(u => u.id);
      const missingIds = userIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Users not found: ${missingIds.join(', ')}`);
    }

    // Assign role to users
    const result = await this.rolesRepository.assignRoleToUsers(roleId, userIds);

    return {
      roleId,
      roleName: role.name,
      assignedUsers: result.count,
      skippedUsers: userIds.length - result.count,
      details: userIds.map(userId => ({
        userId,
        status: 'assigned',
        assignedAt: new Date()
      }))
    };
  }

  async revokeRoleFromUser(roleId: string, userId: string): Promise<any> {
    // Verify role exists
    const role = await this.rolesRepository.findOne(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' not found`);
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Check if user has this role
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId, roleId }
      }
    });

    if (!userRole) {
      throw new NotFoundException(`User does not have this role`);
    }

    // Prevent removing last ADMIN
    if (role.name.toUpperCase() === ERoleName.ADMIN.toString().toUpperCase()) {
      const adminCount = await this.prisma.userRole.count({
        where: { roleId }
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the last ADMIN role from the system');
      }
    }

    await this.rolesRepository.revokeRoleFromUser(roleId, userId);

    return {
      userId,
      roleId,
      roleName: role.name,
      revokedAt: new Date()
    };
  }

  async getUsersByRole(roleId: string, page: number = 1, limit: number = 20, search?: string): Promise<any> {
    // Verify role exists
    const role = await this.rolesRepository.findOne(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' not found`);
    }

    const skip = (page - 1) * limit;
    const { userRoles, total } = await this.rolesRepository.getUsersByRole(roleId, skip, limit, search);

    return {
      role: {
        id: role.id,
        name: role.name,
        description: role.description
      },
      users: userRoles.map((ur: any) => ({
        id: ur.user.id,
        name: ur.user.name,
        email: ur.user.email,
        phoneNumber: ur.user.phoneNumber,
        assignedAt: ur.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
