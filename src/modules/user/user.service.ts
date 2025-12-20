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
}
