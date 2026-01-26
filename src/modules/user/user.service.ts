import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto, UpdateShippingAddressDto, UpdateUserDto, UserFilterDto } from './dto/user.dto';
import { UserRepository } from './repositories/user.repository';
import { IPaginate, PaginateOptions } from '../../libs/models/paginate/pagimate.model';
import { ERoleName } from '../roles/enums/role.enum';
import * as bcrypt from 'bcrypt';
import { UserEmailService } from '../email/email.service';
import { SendEmailDto } from '../email/dto/email.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: UserEmailService
  ) {}

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
  async create(createUserDto: CreateUserDto, avatarImageUrl?: string): Promise<UserEntity> {
    // Check if user already exists
    const existingUser = await this.userRepository.getUserByAccount(createUserDto.id);
    if (existingUser) {
      throw new BadRequestException('User with this id already exists');
    }
    const existingUserByEmail = await this.userRepository.getUserByEmail(createUserDto.email);
    if (existingUserByEmail) {
      throw new BadRequestException('User with this email already exists');
    }

    // Generate a random password if not provided
    const plainPassword = createUserDto.password || 'password123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const createdUser = await this.userRepository.createUser({
      ...createUserDto,
      password: hashedPassword,
      phoneNumber: createUserDto.phoneNumber || '',
      avatarImageUrl,
    });

    // Send welcome email
    try {
      const emailData: SendEmailDto = {
        id: createdUser.id,
        name: createdUser.name,
        email: createUserDto.email,
        phone: createUserDto.phoneNumber || null,
        bankName: '',
        bankAccountNumber: '',
        password: plainPassword,
        createdAt: createdUser.createdAt || new Date(),
        avatarUrl: avatarImageUrl || null,
      };
      await this.emailService.sendWelcomeEmail(emailData, plainPassword);
    } catch (error) {
      // Log error but don't fail user creation if email fails
      console.error('Error sending welcome email:', error);
    }

    return createdUser;
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
  async getUserPoints(userId: string) {
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

  /**
   * Get user order groups with pagination and product details (grouped by orderGroupNumber)
   */
  async getUserOrders(userId: string, pagination: { offset: number; limit: number }): Promise<{
    orderGroups: any[];
    total: number;
    offset: number;
    limit: number;
  }> {
    try {
      return await this.userRepository.getUserOrders(userId, pagination);
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      throw error;
    }
  }

  /**
   * Get user coupons (available and used)
   */
  async getUserCoupons(userId: string): Promise<{
    availableCoupons: any[];
    usedCoupons: any[];
  }> {
    try {
      return await this.userRepository.getUserCoupons(userId);
    } catch (error) {
      console.error('Error in getUserCoupons:', error);
      throw error;
    }
  }

  /**
   * Update user profile (basic info only)
   */
  async updateUserProfile(userId: string, updateData: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    age?: number;
    nickName?: string;
    statusMessage?: string;
  }): Promise<UserEntity> {
    try {
      // Check if user exists
      await this.findOne(userId);

      // Check if email is being updated and if it's already taken
      if (updateData.email) {
        const existingUser = await this.userRepository.getUserByEmail(updateData.email);
        if (existingUser && existingUser.id !== userId) {
          throw new BadRequestException('Email is already taken by another user');
        }
      }

      return await this.userRepository.updateUser(userId, updateData);
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      throw error;
    }
  }

  /**
   * Get user shipping addresses (array of addresses)
   */
  async getUserShippingAddresses(userId: string): Promise<any[]> {
    try {
      return await this.userRepository.getUserShippingAddresses(userId);
    } catch (error) {
      console.error('Error in getUserShippingAddresses:', error);
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
      // Check if user exists
      await this.findOne(userId);

      return await this.userRepository.createUserShippingAddress(userId, addressData);
    } catch (error) {
      console.error('Error in createUserShippingAddress:', error);
      throw error;
    }
  }

  /**
   * Delete user shipping address
   */
  async deleteUserShippingAddress(userId: string, addressId: string): Promise<{ message: string }> {
    try {
      // Check if user exists
      await this.findOne(userId);

      return await this.userRepository.deleteUserShippingAddress(userId, addressId);
    } catch (error) {
      console.error('Error in deleteUserShippingAddress:', error);
      throw error;
    }
  }

  /**
   * Update user shipping address
   */
  async updateUserShippingAddress(
    userId: string,
    addressId: string,
    updateData: UpdateShippingAddressDto
  ): Promise<any> {
    try {
      // Check if user exists
      await this.findOne(userId);

      // Require at least one field to update
      const hasAnyUpdate = Object.values(updateData).some(v => v !== undefined);
      if (!hasAnyUpdate) {
        throw new BadRequestException('No fields provided to update');
      }

      return await this.userRepository.updateUserShippingAddress(userId, addressId, updateData);
    } catch (error) {
      console.error('Error in updateUserShippingAddress:', error);
      throw error;
    }
  }

  /**
   * Find user ID by email and name
   */
  async findUserIdByEmailAndName(email: string, name: string): Promise<string | null> {
    try {
      const user = await this.userRepository.getUserByEmailAndName(email, name);
      return user?.id || null;
    } catch (error) {
      console.error('Error in findUserIdByEmailAndName:', error);
      throw error;
    }
  }

  /**
   * Reset password by ID, name and email
   * Generates a new random password and updates it
   */
  async resetPasswordByIdNameAndEmail(id: string, name: string, email: string): Promise<boolean> {
    try {
      // Verify user exists with matching credentials
      const user = await this.userRepository.getUserByIdNameAndEmail(id, name, email);
      if (!user) {
        return false;
      }

      // Generate a new random password
      const newPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.userRepository.updateUser(id, { password: hashedPassword });

      // Send password changed email
      try {
        const emailData: SendEmailDto = {
          id: user.id,
          name: user.name,
          email: user.email || email,
          phone: user.phoneNumber || null,
          bankName: '',
          bankAccountNumber: '',
          password: newPassword,
          createdAt: user.createdAt || new Date(),
          avatarUrl: null,
        };
        await this.emailService.sendPasswordChangedEmail(emailData);
      } catch (error) {
        // Log error but don't fail password reset if email fails
        console.error('Error sending password changed email:', error);
      }

      return true;
    } catch (error) {
      console.error('Error in resetPasswordByIdNameAndEmail:', error);
      throw error;
    }
  }
}
