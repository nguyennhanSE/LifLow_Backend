import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PolicyService } from './policy.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { ResponseModel } from '../../libs/models/response/response.model';
import { Roles } from '../../libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';
import { PolicyEntity } from './entities/policy.entity';

@ApiTags('Policy')
@ApiBearerAuth()
@Controller('policy')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Create a new policy' })
  @ApiResponse({ status: 201, description: 'Policy created successfully', type: PolicyEntity })
  create(@Body() createPolicyDto: CreatePolicyDto) {
    const responseModel = new ResponseModel();
    return this.policyService.create(createPolicyDto).then((result) => {
      responseModel.setData(result);
      return responseModel;
    });
  }

  @Get()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Get all policies' })
  @ApiResponse({ status: 200, description: 'Policies retrieved successfully', type: [PolicyEntity] })
  findAll() {
    const responseModel = new ResponseModel();
    return this.policyService.findAll().then((result) => {
      responseModel.setData(result);
      return responseModel;
    });
  }

  @Get('active')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @ApiOperation({ summary: 'Get active policy (if exists)' })
  @ApiResponse({ status: 200, description: 'Active policy retrieved successfully', type: PolicyEntity })
  findActive() {
    const responseModel = new ResponseModel();
    return this.policyService.findActive().then((result) => {
      responseModel.setData(result);
      return responseModel;
    });
  }

  @Get(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Get policy by ID' })
  @ApiParam({ name: 'id', description: 'Policy ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Policy retrieved successfully', type: PolicyEntity })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const responseModel = new ResponseModel();
    return this.policyService.findOne(id).then((result) => {
      responseModel.setData(result);
      return responseModel;
    });
  }

  @Patch(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Update policy by ID' })
  @ApiParam({ name: 'id', description: 'Policy ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Policy updated successfully', type: PolicyEntity })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
  ) {
    const responseModel = new ResponseModel();
    return this.policyService.update(id, updatePolicyDto).then((result) => {
      responseModel.setData(result);
      return responseModel;
    });
  }

  @Delete(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Delete policy by ID' })
  @ApiParam({ name: 'id', description: 'Policy ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Policy deleted successfully' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const responseModel = new ResponseModel();
    return this.policyService.remove(id).then(() => {
      responseModel.setData(true);
      return responseModel;
    });
  }
}
