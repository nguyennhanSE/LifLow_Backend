import { 
  Controller, Get, Patch, Post, Body, Param, ParseUUIDPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { 
  UpdateUserPermissionsDto, BulkUpdatePermissionsDto, CheckPermissionDto 
} from './dto/permissions.dto';
import { ResponseModel } from 'src/libs/models/response/response.model';
import { Roles } from 'src/libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  getAllPermissions() {
    const responseModel = new ResponseModel();
    try {
      const result = this.permissionsService.getAllPermissions();
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Get('enum')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER)
  @ApiOperation({ summary: 'Get permission enum for frontend' })
  @ApiResponse({ status: 200, description: 'Permission enum retrieved successfully' })
  getPermissionEnum() {
    const responseModel = new ResponseModel();
    try {
      const result = this.permissionsService.getPermissionEnum();
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Post('check')
  @ApiOperation({ summary: 'Check if user has specific permission' })
  @ApiResponse({ status: 200, description: 'Permission check completed' })
  async checkPermission(@Body() checkDto: CheckPermissionDto) {
    const responseModel = new ResponseModel();
    try {
      const result = await this.permissionsService.checkPermission(checkDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Post('bulk-update')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Bulk update user permissions' })
  @ApiResponse({ status: 200, description: 'Bulk update completed' })
  async bulkUpdatePermissions(@Body() bulkDto: BulkUpdatePermissionsDto) {
    const responseModel = new ResponseModel();
    try {
      const result = await this.permissionsService.bulkUpdatePermissions(bulkDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }
}
