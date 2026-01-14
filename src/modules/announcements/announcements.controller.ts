import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { QueryAnnouncementDto } from './dto/query-announcement.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { ResponseModel } from '../../libs/models/response/response.model';
import { Public } from '../../libs/decorator/public.decorator';
import { Roles } from '../../libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';
import { AnnouncementType } from '@prisma/client';
import { AwsService } from '../../libs/integration/aws/aws.service';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
  ) {}

  @Post()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Create a new announcement with image upload' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'type', 'content'],
      properties: {
        title: { type: 'string', description: 'Announcement title' },
        type: {
          type: 'string',
          enum: ['GENERAL', 'RECIPE', 'USER'],
          description: 'Announcement type',
        },
        content: { type: 'string', description: 'Announcement content' },
        isFixed: { type: 'boolean', description: 'Whether announcement is pinned', default: false },
        authorName: { type: 'string', description: 'Author name' },
        status: { type: 'string', description: 'Status (default: active)', default: 'active' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Announcement created successfully',
    type: AnnouncementResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or author not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(
    @Req() req: Request & { user: { sub: string } },
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @UploadedFile() files?: Express.Multer.File,
  ) {
    const responseModel = new ResponseModel();
    const file = files?.[0];
    try {
      const announcement = await this.announcementsService.create(
        createAnnouncementDto,
        req.user.sub,
        file,
      );
      responseModel.setData(announcement);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all announcements with pagination and filters' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: AnnouncementType,
    description: 'Filter by announcement type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by status (active/inactive)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in title and content',
  })
  @ApiResponse({
    status: 200,
    description: 'Announcements retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AnnouncementResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  async findAll(@Query() query: QueryAnnouncementDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.announcementsService.findAll(query);
      responseModel.setData(result);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Get('statistics')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get announcement statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalCount: { type: 'number' },
        byType: {
          type: 'object',
          properties: {
            GENERAL: { type: 'number' },
            RECIPE: { type: 'number' },
            USER: { type: 'number' },
          },
        },
        byStatus: {
          type: 'object',
          properties: {
            active: { type: 'number' },
            inactive: { type: 'number' },
          },
        },
        totalViews: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getStatistics() {
    const responseModel = new ResponseModel();

    try {
      const statistics = await this.announcementsService.getStatistics();
      responseModel.setData(statistics);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Get('by-author/:authorId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all announcements by a specific author' })
  @ApiParam({
    name: 'authorId',
    description: 'Author user ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Announcements retrieved successfully',
    type: [AnnouncementResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findByAuthor(
    @Param('authorId', new ParseUUIDPipe({ version: '4' })) authorId: string,
  ) {
    const responseModel = new ResponseModel();

    try {
      const announcements = await this.announcementsService.findByAuthor(
        authorId,
      );
      responseModel.setData(announcements);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Get('fixed')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all fixed/pinned announcements' })
  @ApiResponse({
    status: 200,
    description: 'Fixed announcements retrieved successfully',
    type: [AnnouncementResponseDto],
  })
  async findFixedAnnouncements() {
    const responseModel = new ResponseModel();

    try {
      const announcements = await this.announcementsService.findFixedAnnouncements();
      responseModel.setData(announcements);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Get('active/:type')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active announcements by type' })
  @ApiParam({
    name: 'type',
    description: 'Announcement type',
    enum: AnnouncementType,
  })
  @ApiResponse({
    status: 200,
    description: 'Active announcements retrieved successfully',
    type: [AnnouncementResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid type',
  })
  async findActiveByType(@Param('type') type: AnnouncementType) {
    const responseModel = new ResponseModel();

    try {
      const announcements = await this.announcementsService.findActiveByType(
        type,
      );
      responseModel.setData(announcements);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single announcement by ID',
    description: 'Automatically increments view count when fetched',
  })
  @ApiParam({
    name: 'id',
    description: 'Announcement ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Announcement retrieved successfully',
    type: AnnouncementResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Announcement not found',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const responseModel = new ResponseModel();

    try {
      const announcement = await this.announcementsService.findOne(id);
      responseModel.setData(announcement);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Update an announcement with optional image upload',
    description: 'Only the author can update their announcement',
  })
  @ApiParam({
    name: 'id',
    description: 'Announcement ID (UUID)',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Announcement title' },
        type: {
          type: 'string',
          enum: ['GENERAL', 'RECIPE', 'USER'],
          description: 'Announcement type',
        },
        content: { type: 'string', description: 'Announcement content' },
        authorName: { type: 'string', description: 'Author name' },
        isFixed: { type: 'boolean', description: 'Whether announcement is pinned' },
        status: { type: 'string', description: 'Status' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Announcement updated successfully',
    type: AnnouncementResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not the author of this announcement',
  })
  @ApiResponse({
    status: 404,
    description: 'Announcement not found',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @UploadedFile() files?: Express.Multer.File,
  ) {
    const responseModel = new ResponseModel();
    const file = files?.[0];

    try {
      const announcement = await this.announcementsService.update(
        id,
        updateAnnouncementDto,
        req.user.sub,
        file,
      );
      responseModel.setData(announcement);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an announcement (soft delete)',
    description:
      'Only the author can delete their announcement. Sets status to inactive.',
  })
  @ApiParam({
    name: 'id',
    description: 'Announcement ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Announcement deleted successfully (soft delete)',
    type: AnnouncementResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not the author of this announcement',
  })
  @ApiResponse({
    status: 404,
    description: 'Announcement not found',
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const responseModel = new ResponseModel();

    try {
      const announcement = await this.announcementsService.remove(
        id,
        req.user.sub,
      );
      responseModel.setData(announcement);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id/toggle-fixed')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle fixed/pinned status for an announcement',
    description: 'Admin can pin/unpin announcements to appear at the top of the list',
  })
  @ApiParam({
    name: 'id',
    description: 'Announcement ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Fixed status toggled successfully',
    type: AnnouncementResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin/manager access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Announcement not found',
  })
  async toggleFixed(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const responseModel = new ResponseModel();

    try {
      const announcement = await this.announcementsService.toggleFixed(id);
      responseModel.setData(announcement);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id/hard')
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Permanently delete an announcement (admin only)',
    description:
      'WARNING: This is a permanent deletion. Use with extreme caution.',
  })
  @ApiParam({
    name: 'id',
    description: 'Announcement ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Announcement permanently deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Announcement not found',
  })
  async hardDelete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const responseModel = new ResponseModel();

    try {
      await this.announcementsService.hardDelete(id);
      responseModel.setData({ message: 'Announcement permanently deleted' });
      return responseModel;
    } catch (error) {
      throw error;
    }
  }
}
