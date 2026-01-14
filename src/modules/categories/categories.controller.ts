import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CategoryFilterDto } from './dto/category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ResponseModel } from '../../libs/models/response/response.model';
import { paginationResponse } from '../../utils/responseFormatter';
import { ERoleName } from '../roles/enums/role.enum';
import { Roles } from '../../libs/decorator/roles.decorator';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Conflict - category already exists' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const responseModel = new ResponseModel();

    try {
      const category = await this.categoriesService.create(createCategoryDto);
      responseModel.setData(category);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('/list')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get paginated list of categories with filters' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async findAll(@Query() filterDto: CategoryFilterDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.categoriesService.findAll(filterDto);
      const data = paginationResponse(
        result.categories,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Categories retrieved successfully',
      );
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get(':productCategoryNumber')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get category by productCategoryNumber' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('productCategoryNumber') productCategoryNumber: string) {
    const responseModel = new ResponseModel();

    try {
      const category = await this.categoriesService.findOne(+productCategoryNumber);
      responseModel.setData(category);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Patch(':productCategoryNumber')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @ApiOperation({ summary: 'Update a category' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  async update(
    @Param('productCategoryNumber') productCategoryNumber: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const responseModel = new ResponseModel();

    try {
      const category = await this.categoriesService.update(+productCategoryNumber, updateCategoryDto);
      responseModel.setData(category);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Delete(':productCategoryNumber')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async remove(@Param('productCategoryNumber') productCategoryNumber: string) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.categoriesService.remove(+productCategoryNumber);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
}
