import { 
  Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { 
  CreateRoleDto, UpdateRoleDto, RoleQueryDto, AssignRolesToUserDto 
} from './dto/roles.dto';
import { ResponseModel } from 'src/libs/models/response/response.model';
import { Roles } from 'src/libs/decorator/roles.decorator';
import { ERoleName } from './enums/role.enum';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    const result = await this.rolesService.create(createRoleDto);
    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }

  @Get()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Get all roles with pagination and search' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  async findAll(@Query() query: RoleQueryDto) {
    const result = await this.rolesService.findAll(query);
    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }

  @Get('search')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Search roles' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async search(@Query() query: RoleQueryDto) {
    return this.findAll(query);
  }

  @Get(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.rolesService.findOne(id);
    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }

  @Patch(':id')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateRoleDto: UpdateRoleDto
  ) {
    const result = await this.rolesService.update(id, updateRoleDto);
    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }

  @Delete(':id')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('force') force?: string
  ) {
    const result = await this.rolesService.remove(id, force === 'true');
    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }

  @Post(':id/users')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Assign role to multiple users' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  async assignRoleToUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignDto: AssignRolesToUserDto
  ) {
    const result = await this.rolesService.assignRoleToUsers(id, assignDto);
    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }

  @Delete(':roleId/users/:userId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Revoke role from user' })
  @ApiResponse({ status: 200, description: 'Role revoked successfully' })
  async revokeRoleFromUser(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('userId') userId: string
  ) {
    const result = await this.rolesService.revokeRoleFromUser(roleId, userId);
    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }

  @Get(':id/users')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Get all users with specific role' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsersByRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string
  ) {
    const result = await this.rolesService.getUsersByRole(
      id, 
      page ? Number(page) : 1, 
      limit ? Number(limit) : 20,
      search
    );
    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }
}
