import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, Req, ForbiddenException, NotFoundException, BadRequestException, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, GetAdminListQueryDto, GetUserInfoDto, GetUsersQueryDto, UpdateUserDto, UpdateUserProfileDto, CreateShippingAddressDto, UpdateShippingAddressDto, FindUserIdDto, FindPasswordDto } from './dto/user.dto';
import { Roles } from '../../libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';
import { toResponse } from './mapper/user.mapper';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ResponseModel } from '../../libs/models/response/response.model';
import { PermissionsService } from '../permissions/permissions.service';
import { UpdateUserPermissionsDto } from '../permissions/dto/permissions.dto';
import { RolesService } from '../roles/roles.service';
import { AssignRolesToSingleUserDto } from '../roles/dto/roles.dto';
import { Request } from 'express';
import { TokenPayload } from 'src/libs/constants/interface';
import { MembershipsService } from '../memberships/memberships.service';
import { QueryUserMembershipsDto } from '../memberships/dto/membership.dto';  
import { OrderRepository } from '../order/repositories/order.repository';
import { Public } from 'src/libs/decorator/public.decorator';
import { AwsService } from '../../libs/integration/aws/aws.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('User Management')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly permissionsService: PermissionsService,
    private readonly rolesService: RolesService,
    private readonly membershipsService: MembershipsService,
    private readonly orderRepository: OrderRepository,
    private readonly awsService: AwsService
  ) {}

  @Post("create")
  @Public()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatarImage', maxCount: 1 },
    ])
  )
  @ApiOperation({ summary: 'Create a new user with role assignment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create user with avatar image',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'User ID',
          example: '1234567890',
        },
        password: {
          type: 'string',
          description: 'User password (10-16 characters)',
          example: 'password123',
        },
        name: {
          type: 'string',
          description: 'User full name',
          example: 'John Doe',
        },
        mobilePhoneNumber: {
          type: 'string',
          description: 'Mobile phone number',
          example: '010-1234-5678',
        },
        phoneNumber: {
          type: 'string',
          description: 'Phone number',
          example: '010-1234-5678',
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'User email address',
          example: 'john.doe@gmail.com',
        },
        zipCode: {
          type: 'number',
          description: 'User zip code',
          example: 12345,
        },
        addressName: {
          type: 'string',
          description: 'User address name',
          example: 'Home',
        },
        addressFull: {
          type: 'string',
          description: 'User full address',
          example: '123 Main St, Anytown, USA',
        },
        dateOfBirth: {
          type: 'string',
          format: 'date',
          description: 'User date of birth (YYYY-MM-DD)',
          example: '1990-01-01',
        },
        nickName: {
          type: 'string',
          description: 'User nick name',
          example: 'Johnny',
        },
        statusMessage: {
          type: 'string',
          description: 'User status message',
          example: 'I am a user',
        },
        avatarImage: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image (max 5MB, jpg/jpeg/png/webp)',
        },
      },
      required: ['id', 'password', 'name', 'phoneNumber', 'email', 'dateOfBirth'],
    },
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or user already exists' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFiles() files: { avatarImage?: Express.Multer.File[] }
  ) {
    const responseModel = new ResponseModel();
    const avatarImage = files?.avatarImage?.[0];
    if (!avatarImage) {
      throw new BadRequestException('Avatar image is required');
    }
    
    const avatarImageUrl = await this.awsService.uploadFile('users', createUserDto.id, avatarImage);

    try {
      const user = await this.userService.create(createUserDto, avatarImageUrl);
      const result = toResponse(user);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('list')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @ApiOperation({ summary: 'Get paginated list of users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async list(@Query() q: GetUsersQueryDto) {
    const responseModel = new ResponseModel();

    try {
      const { 
        page, 
        limit, 
        sort, 
        sortBy, 
        counted, 
        q: search, 
        email, 
        searchField,
        role,
        status,
        nickName
      } = q;

      const pageNum = page ? (typeof page === 'string' ? parseInt(page, 10) : page) : 1;
      const limitNum = limit ? (typeof limit === 'string' ? parseInt(limit, 10) : limit) : 10;

      const data = await this.userService.getUserPaginate(
        { 
          page: pageNum, 
          limit: limitNum, 
          sort: sort || 'asc', 
          sortBy: sortBy || 'createdAt' 
        },
        { 
          q: search, 
          email, 
          searchField, 
          role: role === 'ALL' ? undefined : role,
          status,
          nickName
        },
        { counted: counted ?? true },
      );
      const lastDocs = await Promise.all(data.docs.map(async e => {return { ...e, orderNumber: await this.orderRepository.getOrderNumber(e.id) }}));
      const docs = lastDocs.map(e => toResponse(e));

      const result = { ...data, docs: docs };
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('admin-list')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Get list of admin users' })
  @ApiResponse({ status: 200, description: 'Admin users retrieved successfully' })
  async getAdminList(@Query() q: GetAdminListQueryDto) {
    const responseModel = new ResponseModel();
    try {
      const { 
        page, 
        limit, 
        sort, 
        sortBy, 
        q: search,
        role
      } = q;
      const pageNum = page ? (typeof page === 'string' ? parseInt(page, 10) : page) : 1;
      const limitNum = limit ? (typeof limit === 'string' ? parseInt(limit, 10) : limit) : 10;
      const result = await this.userService.getAdminPaginate(
        { 
          page: pageNum, 
          limit: limitNum, 
          sort: sort || 'asc', 
          sortBy: sortBy || 'createdAt' 
        },
        { q: search, role: role === 'ALL' ? undefined : role },
        { counted: true },
      );
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get('stats/new-signup/today')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @ApiOperation({ summary: 'New sign-up count (users created today)' })
  @ApiResponse({ status: 200, description: 'New sign-up count retrieved successfully' })
  async getNewSignupToday() {
    const responseModel = new ResponseModel();

    try {
      const result = await this.userService.countNewSignupsToday();
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('member/:id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const user = await this.userService.findOne(id);
      const result = toResponse(user);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Delete(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.userService.remove(id);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get(':userId/permissions')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiResponse({ status: 200, description: 'User permissions retrieved successfully' })
  async getUserPermissions(
    @Param('userId') userId: string,
    @Req() req: Request & { user?: TokenPayload }
  ) {
    const responseModel = new ResponseModel();
    try {
      // Allow users to view their own permissions
      const requestingUser = req.user;
      if (requestingUser?.sub !== userId && !requestingUser?.roles?.includes(ERoleName.ADMIN)) {
        throw new ForbiddenException('Cannot view other users permissions');
      }

      const result = await this.permissionsService.getUserPermissions(userId);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Patch(':userId/permissions')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Update user permissions' })
  @ApiResponse({ status: 200, description: 'User permissions updated successfully' })
  async updateUserPermissions(
    @Param('userId') userId: string,
    @Body() updateDto: UpdateUserPermissionsDto
  ) {
    const responseModel = new ResponseModel();
    try {
      const result = await this.permissionsService.updateUserPermissions(
        userId, 
        updateDto.permissions
      );
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get(':userId/roles')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Get user roles' })
  @ApiResponse({ status: 200, description: 'User roles retrieved successfully' })
  async getUserRoles(
    @Param('userId') userId: string,
    @Req() req: Request & { user?: TokenPayload }
  ) {
    const responseModel = new ResponseModel();
    try {
      // Allow users to view their own roles
      const requestingUser = req.user;
      if (requestingUser?.sub !== userId && !requestingUser?.roles?.includes(ERoleName.ADMIN)) {
        throw new ForbiddenException('Cannot view other users roles');
      }

      const roles = await this.rolesService.getUserRoles(userId);
      const user = await this.userService.findOne(userId);
      
      responseModel.setData({
        userId,
        userName: user.name,
        roles: roles.map(name => ({ name }))
      });
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Post(':userId/roles')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Assign roles to user' })
  @ApiResponse({ status: 200, description: 'Roles assigned successfully' })
  async assignRolesToUser(
    @Param('userId') userId: string,
    @Body() assignDto: AssignRolesToSingleUserDto
  ) {
    const responseModel = new ResponseModel();
    try {
      // Verify user exists
      await this.userService.findOne(userId);

      // Assign each role
      const results: any[] = [];
      for (const roleId of assignDto.roleIds) {
        const result = await this.rolesService.assignRoleToUsers(roleId, { userIds: [userId] });
        results.push(result);
      }

      responseModel.setData({
        userId,
        assignedRoles: assignDto.roleIds.length,
        results
      });
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Delete(':userId/roles/:roleId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  async removeRoleFromUser(
    @Param('userId') userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string
  ) {
    const responseModel = new ResponseModel();
    try {
      const result = await this.rolesService.revokeRoleFromUser(roleId, userId);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get('by-role/:roleId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Get users by role' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsersByRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string
  ) {
    const responseModel = new ResponseModel();
    try {
      const result = await this.rolesService.getUsersByRole(
        roleId,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20,
        search
      );
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get(':userId/memberships')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @ApiOperation({ summary: 'Get user memberships' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User memberships retrieved successfully' })
  async getUserMemberships(
    @Param('userId') userId: string,
    @Query() query: QueryUserMembershipsDto,
    @Req() req: Request & { user?: TokenPayload }
  ) {
    const responseModel = new ResponseModel();
    try {
      // Allow users to view their own memberships
      const requestingUser = req.user;
      if (requestingUser?.sub !== userId && !requestingUser?.roles?.includes(ERoleName.ADMIN)) {
        throw new ForbiddenException('Cannot view other users memberships');
      }

      const result = await this.membershipsService.getUserMemberships(userId, query);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get(':userId/memberships/active')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get user active membership' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Active membership retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No active membership found' })
  async getUserActiveMembership(
    @Param('userId') userId: string,
    @Req() req: Request & { user?: TokenPayload }
  ) {
    const responseModel = new ResponseModel();
    try {
      // Allow users to view their own active membership
      const requestingUser = req.user;
      if (requestingUser?.sub !== userId && !requestingUser?.roles?.includes(ERoleName.ADMIN)) {
        throw new ForbiddenException('Cannot view other users membership');
      }

      const result = await this.membershipsService.getUserActiveMembership(userId);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }
  @Get('/me/points')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get user order number' })
  @ApiResponse({ status: 200, description: 'User order number retrieved successfully' })
  async getUserPoints(@Req() req: Request & { user?: TokenPayload }) {
    const responseModel = new ResponseModel();
    try {
      const requestingUserId = req.user?.sub;
      if (!requestingUserId) {
        throw new ForbiddenException('Cannot view other users points');
      }
      const result = await this.userService.getUserPoints(requestingUserId);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }
  
  @Get('/me')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved successfully' })
  async getUserInfo(@Req() req: Request & { user?: TokenPayload }, @Query() q: GetUserInfoDto) {
    const responseModel = new ResponseModel();
    try {
      const requestingUserId = req.user?.sub;
      if (!requestingUserId) {
        throw new ForbiddenException('Cannot view other users information');
      }
      const result = await this.userService.getUserInfo(requestingUserId, {
        includeOrders: q.includeOrders ?? false,
        includePermissions: q.includePermissions ?? false,
        includeMembership: q.includeMembership ?? true,
        includePoint: q.includePoint ?? false,
        includeCarts: q.includeCarts ?? false,
        includePayments: q.includePayments ?? false,
        includeProductReviews: q.includeProductReviews ?? false,
        includeProductInquiries: q.includeProductInquiries ?? false,
        includeCouponHistories: q.includeCouponHistories ?? false,
        includeRecipes: q.includeRecipes ?? false,
      });
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get('/me/orders')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get user order groups with pagination (grouped by orderGroupNumber)' })
  @ApiResponse({ status: 200, description: 'User order groups retrieved successfully' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination', example: 0 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit for pagination', example: 10 })
  async getUserOrders(
    @Req() req: Request & { user?: TokenPayload },
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const responseModel = new ResponseModel();
    try {
      const requestingUserId = req.user?.sub;
      
      if (!requestingUserId) {
        throw new ForbiddenException('User not authenticated');
      }

      // Parse pagination params
      const parsedOffset = offset ? parseInt(offset, 10) : 0;
      const parsedLimit = limit ? parseInt(limit, 10) : 10;

      // Validate pagination params
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw new BadRequestException('Invalid offset parameter');
      }

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        throw new BadRequestException('Invalid limit parameter (must be between 1 and 100)');
      }

      // Get user order groups with product details (grouped by orderGroupNumber)
      const result = await this.userService.getUserOrders(requestingUserId, {
        offset: parsedOffset,
        limit: parsedLimit,
      });

      responseModel.setData(result);
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      throw error;
    }

    return responseModel;
  }

  @Get('/me/coupons')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get user available and used coupons' })
  @ApiResponse({ status: 200, description: 'User coupons retrieved successfully' })
  async getUserCoupons(@Req() req: Request & { user?: TokenPayload }) {
    const responseModel = new ResponseModel();
    try {
      const requestingUserId = req.user?.sub;
      
      if (!requestingUserId) {
        throw new ForbiddenException('User not authenticated');
      }

      const coupons = await this.userService.getUserCoupons(requestingUserId);
      responseModel.setData(coupons);
    } catch (error) {
      console.error('Error in getUserCoupons:', error);
      throw error;
    }

    return responseModel;
  }

  @Patch('/me')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Update user profile (basic info)' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  async updateUserProfile(
    @Req() req: Request & { user?: TokenPayload },
    @Body() updateProfileDto: UpdateUserProfileDto,
  ) {
    const responseModel = new ResponseModel();
    try {
      const requestingUserId = req.user?.sub;
      
      if (!requestingUserId) {
        throw new ForbiddenException('User not authenticated');
      }

      const updatedUser = await this.userService.updateUserProfile(requestingUserId, updateProfileDto);
      const result = toResponse(updatedUser);
      responseModel.setData(result);
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      throw error;
    }

    return responseModel;
  }
  
  @Patch(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER)
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const responseModel = new ResponseModel();

    try {
      const user = await this.userService.update(id, updateUserDto);
      const result = toResponse(user);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('/me/shipping-address')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get user shipping addresses' })
  @ApiResponse({ status: 200, description: 'User shipping addresses retrieved successfully (returns empty array if no addresses found)' })
  async getUserShippingAddresses(@Req() req: Request & { user?: TokenPayload }) {
    const responseModel = new ResponseModel();
    try {
      const requestingUserId = req.user?.sub;
      
      if (!requestingUserId) {
        throw new ForbiddenException('User not authenticated');
      }

      const addresses = await this.userService.getUserShippingAddresses(requestingUserId);
      responseModel.setData(addresses); // Will be empty array if no addresses exist
    } catch (error) {
      console.error('Error in getUserShippingAddresses:', error);
      throw error;
    }

    return responseModel;
  }

  @Post('/me/shipping-address')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Create or update user shipping address' })
  @ApiResponse({ status: 201, description: 'Shipping address created/updated successfully' })
  async createUserShippingAddress(
    @Req() req: Request & { user?: TokenPayload },
    @Body() createAddressDto: CreateShippingAddressDto,
  ) {
    const responseModel = new ResponseModel();
    try {
      const requestingUserId = req.user?.sub;
      
      if (!requestingUserId) {
        throw new ForbiddenException('User not authenticated');
      }

      const address = await this.userService.createUserShippingAddress(requestingUserId, createAddressDto);
      responseModel.setData(address);
    } catch (error) {
      console.error('Error in createUserShippingAddress:', error);
      throw error;
    }

    return responseModel;
  }

  @Get('/check-id')
  @Public()
  @ApiOperation({ summary: 'Check if user ID exists' })
  @ApiQuery({ name: 'id', required: true, description: 'User ID to check', type: String })
  @ApiResponse({ status: 200, description: 'User ID check completed' })
  async checkUserId(@Query('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const user = await this.userService.getUserByAccount(id);
      responseModel.setData({ exists: !!user, userId: id });
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('/find-id')
  @Public()
  @ApiOperation({ summary: 'Find user ID by name and email' })
  @ApiQuery({ name: 'name', required: true, description: 'User full name', type: String })
  @ApiQuery({ name: 'email', required: true, description: 'User email address', type: String })
  @ApiResponse({ status: 200, description: 'User ID found successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findUserId(@Query() findUserIdDto: FindUserIdDto) {
    const responseModel = new ResponseModel();

    try {
      const userId = await this.userService.findUserIdByEmailAndName(findUserIdDto.email, findUserIdDto.name);
      if (!userId) {
        throw new NotFoundException('User not found with the provided name and email');
      }
      responseModel.setData({ userId });
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('/find-password')
  @Public()
  @ApiOperation({ summary: 'Find/Reset password by ID, name and email' })
  @ApiQuery({ name: 'id', required: true, description: 'User ID', type: String })
  @ApiQuery({ name: 'name', required: true, description: 'User full name', type: String })
  @ApiQuery({ name: 'email', required: true, description: 'User email address', type: String })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findPassword(@Query() findPasswordDto: FindPasswordDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.userService.resetPasswordByIdNameAndEmail(
        findPasswordDto.id,
        findPasswordDto.name,
        findPasswordDto.email
      );
      if (!result) {
        throw new NotFoundException('User not found with the provided ID, name and email');
      }
      responseModel.setData({ message: 'Password has been reset. Please check your email for the new password.' });
    } catch (error) {
      throw error;
    }

    return responseModel;
  } 
  
  @Patch('/me/shipping-address/:addressId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Update user shipping address' })
  @ApiParam({ name: 'addressId', description: 'Shipping address ID' })
  @ApiResponse({ status: 200, description: 'Shipping address updated successfully' })
  async updateUserShippingAddress(
    @Req() req: Request & { user?: TokenPayload },
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateShippingAddressDto,
  ) {
    const responseModel = new ResponseModel();
    try {
      const requestingUserId = req.user?.sub;

      if (!requestingUserId) {
        throw new ForbiddenException('User not authenticated');
      }

      const address = await this.userService.updateUserShippingAddress(requestingUserId, addressId, updateAddressDto);
      responseModel.setData(address);
    } catch (error) {
      console.error('Error in updateUserShippingAddress:', error);
      throw error;
    }

    return responseModel;
  }

  @Delete('/me/shipping-address/:addressId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Delete user shipping address' })
  @ApiParam({ name: 'addressId', description: 'Shipping address ID' })
  @ApiResponse({ status: 200, description: 'Shipping address deleted successfully' })
  async deleteUserShippingAddress(
    @Req() req: Request & { user?: TokenPayload },
    @Param('addressId') addressId: string,
  ) {
    const responseModel = new ResponseModel();
    try {
      const requestingUserId = req.user?.sub;

      if (!requestingUserId) {
        throw new ForbiddenException('User not authenticated');
      }

      const result = await this.userService.deleteUserShippingAddress(requestingUserId, addressId);
      responseModel.setData(result);
    } catch (error) {
      console.error('Error in deleteUserShippingAddress:', error);
      throw error;
    }

    return responseModel;
  }
}
