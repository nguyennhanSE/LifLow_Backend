import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import {
  CreateMembershipDto,
  UpdateMembershipDto,
  AssignMembershipDto,
  UpdateUserMembershipDto,
  QueryMembershipDto,
  QueryUserMembershipsDto,
} from './dto/membership.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ResponseModel } from '../../libs/models/response/response.model';
import { Roles } from '../../libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';

@ApiTags('Membership Management')
@ApiBearerAuth()
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  // ============= MEMBERSHIP CRUD =============

  @Post()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Create a new membership tier' })
  @ApiResponse({ status: 201, description: 'Membership created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - membership already exists or validation error' })
  async create(@Body() createMembershipDto: CreateMembershipDto) {
    const responseModel = new ResponseModel();
    try {
      const membership = await this.membershipsService.create(createMembershipDto);
      responseModel.setData(membership);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @ApiOperation({ summary: 'Get paginated list of memberships' })
  @ApiResponse({ status: 200, description: 'Memberships retrieved successfully' })
  async findAll(@Query() query: QueryMembershipDto) {
    const responseModel = new ResponseModel();
    try {
      const data = await this.membershipsService.findAll(query);
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @ApiOperation({ summary: 'Get membership by ID' })
  @ApiParam({ name: 'id', description: 'Membership ID' })
  @ApiResponse({ status: 200, description: 'Membership retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async findOne(@Param('id') id: string) {
    const responseModel = new ResponseModel();
    try {
      const membership = await this.membershipsService.findOne(id);
      responseModel.setData(membership);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Patch(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Update membership' })
  @ApiParam({ name: 'id', description: 'Membership ID' })
  @ApiResponse({ status: 200, description: 'Membership updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async update(
    @Param('id') id: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
  ) {
    const responseModel = new ResponseModel();
    try {
      const membership = await this.membershipsService.update(id, updateMembershipDto);
      responseModel.setData(membership);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Delete(':id')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Delete membership' })
  @ApiParam({ name: 'id', description: 'Membership ID' })
  @ApiResponse({ status: 200, description: 'Membership deleted successfully' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async remove(@Param('id') id: string) {
    const responseModel = new ResponseModel();
    try {
      const result = await this.membershipsService.remove(id);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  // ============= USER MEMBERSHIP MANAGEMENT =============

  @Post('assign')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER)
  @ApiOperation({ summary: 'Assign membership to a user' })
  @ApiResponse({ status: 201, description: 'Membership assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - user already has membership or validation error' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async assignMembership(@Body() assignDto: AssignMembershipDto) {
    const responseModel = new ResponseModel();
    try {
      const userMembership = await this.membershipsService.assignMembershipToUser(assignDto);
      responseModel.setData(userMembership);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get(':membershipId/users')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @ApiOperation({ summary: 'Get all users with a specific membership' })
  @ApiParam({ name: 'membershipId', description: 'Membership ID' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async getMembershipUsers(
    @Param('membershipId') membershipId: string,
    @Query() query: QueryUserMembershipsDto,
  ) {
    const responseModel = new ResponseModel();
    try {
      const data = await this.membershipsService.getMembershipUsers(membershipId, query);
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get('user/:userId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @ApiOperation({ summary: 'Get all memberships for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User memberships retrieved successfully' })
  async getUserMemberships(
    @Param('userId') userId: string,
    @Query() query: QueryUserMembershipsDto,
  ) {
    const responseModel = new ResponseModel();
    try {
      const data = await this.membershipsService.getUserMemberships(userId, query);
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get('user/:userId/active')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get active membership for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Active membership retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No active membership found' })
  async getUserActiveMembership(@Param('userId') userId: string) {
    const responseModel = new ResponseModel();
    try {
      const membership = await this.membershipsService.getUserActiveMembership(userId);
      responseModel.setData(membership);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Patch('user/:userId/')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER)
  @ApiOperation({ summary: 'Update user membership (status, dates)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User membership updated successfully' })
  @ApiResponse({ status: 404, description: 'User membership not found' })
  async updateUserMembership(
    @Param('userId') userId: string,
    @Body() updateDto: UpdateUserMembershipDto,
  ) {
    const responseModel = new ResponseModel();
    try {
      const userMembership = await this.membershipsService.updateUserMembership(
        userId,
        updateDto,
      );
      responseModel.setData(userMembership);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Delete('user/:userId/membership/:membershipId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Remove membership from user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'membershipId', description: 'Membership ID' })
  @ApiResponse({ status: 200, description: 'Membership removed successfully' })
  @ApiResponse({ status: 404, description: 'User membership not found' })
  async removeUserMembership(
    @Param('userId') userId: string,
    @Param('membershipId') membershipId: string,
  ) {
    const responseModel = new ResponseModel();
    try {
      const result = await this.membershipsService.removeUserMembership(userId, membershipId);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  // ============= MEMBERSHIP RECALCULATION =============

  @Post('recalculate-all')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Manually trigger membership recalculation for all users',
    description:
      'Recalculates all user memberships based on their purchase history and current membership tier thresholds. ' +
      'This is automatically triggered when admin updates membership minPrice, but can also be run manually.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recalculation completed',
    schema: {
      example: {
        data: {
          totalUsersProcessed: 150,
          totalUpdated: 45,
          totalCreated: 12,
          errors: 0,
        },
      },
    },
  })
  async recalculateAllMemberships() {
    const responseModel = new ResponseModel();
    try {
      const result = await this.membershipsService.recalculateAllMemberships();
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }
}
