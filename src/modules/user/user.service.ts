import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/user.dto';
import { UserRepository } from './repositories/user.repository';
import { IPaginate, PaginateOptions } from '../../libs/models/paginate/pagimate.model';
import { ERoleName } from '../roles/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async countNewSignupsToday(): Promise<{ date: string; count: number }> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const count = await this.userRepository.countUsersCreatedBetween(start, end);
    const yyyy = start.getFullYear();
    const mm = String(start.getMonth() + 1).padStart(2, '0');
    const dd = String(start.getDate()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, count };
  }

  /**
   * Get user by account (id)
   */
  async getUserByAccount(account: string): Promise<UserEntity | null> {
    return await this.userRepository.getUserByAccount(account);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserEntity | null> {
    return await this.userRepository.getUserByEmail(email);
  }

  /**
   * Create a new user with role assignment
   * Default role is USER if not provided
   */
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // Check if user already exists
    const existingUser = await this.userRepository.getUserByEmail(createUserDto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Generate a random password if not provided
    const password = await bcrypt.hash('password123', 10); // Default password

    return this.userRepository.createUser({
      ...createUserDto,
      password,
      phoneNumber: createUserDto.phoneNumber || '',
    });
  }

  /**
   * Get paginated users
   */
  async getUserPaginate(
    paginateRequest: PaginateOptions,
    filter: UserFilterDto,
    options: { counted?: boolean }
  ): Promise<IPaginate<UserEntity>> {
    return this.userRepository.getUserPaginate(filter, {
      ...paginateRequest,
      counted: options.counted,
    });
  }

  /**
   * Get paginated admin users
   */
  async getAdminPaginate(
    paginateRequest: PaginateOptions,
    filter: UserFilterDto,
    options: { counted?: boolean }
  ): Promise<IPaginate<UserEntity>> {
    return this.userRepository.getAdminPaginate(filter, {
      ...paginateRequest,
      counted: options.counted,
    });
  }

  /**
   * Find one user by id
   */
  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepository.getUserByAccount(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    // Check if user exists
    await this.findOne(id);

    // Check if email is being updated and if it's already taken by another user
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.getUserByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Email is already taken by another user');
      }
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (updateUserDto.password) {
      hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Prepare update data
    const { password, ...otherData } = updateUserDto;
    const updateData: Partial<UserEntity> & { role?: ERoleName; password?: string } = {
      ...otherData,
      ...(hashedPassword && { password: hashedPassword }),
    };

    return this.userRepository.updateUser(id, updateData);
  }

  /**
   * Remove user
   */
  async remove(id: string): Promise<{ message: string }> {
    // Check if user exists
    await this.findOne(id);

    // Delete user
    await this.userRepository.deleteUser(id);

    return { message: `User ${id} deleted successfully` };
  }
  /**
   * Get user points
   */
  async getUserPoints(userId: string): Promise<{totalUsedPoints: number, availablePoints: number}> {
    try {
      return await this.userRepository.getUserPoints(userId);
    } catch (error) {
      console.error('Error in getUserPoints:', error);
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
      return await this.userRepository.getUserInfo(userId, options);
    } catch (error) {
      console.error('Error in getUserInfo:', error);
      throw error;
    }
  }
}
