import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
import { RemoveFcmTokenDto } from './dto/remove-fcm-token.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { ResponseModel } from 'libs/models/response/response.model';
import { ERoleName } from '../roles/enums/role.enum';
import { Roles } from 'src/libs/decorator/roles.decorator';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('token')
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save FCM token for push notifications' })
  @ApiResponse({ status: 200, description: 'Token saved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async saveToken(@Req() req: AuthenticatedRequest, @Body() dto: SaveFcmTokenDto) {
    const responseModel = new ResponseModel();
    const result = await this.notificationsService.saveToken(req.user.sub, dto);
    responseModel.setData(result);
    return responseModel;
  }

  @Delete('token')
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove FCM token (e.g. on logout)' })
  @ApiResponse({ status: 200, description: 'Token removed' })
  async removeToken(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RemoveFcmTokenDto,
  ) {
    const responseModel = new ResponseModel();
    const result = await this.notificationsService.removeToken(req.user.sub, dto.token);
    responseModel.setData(result);
    return responseModel;
  }

  @Post('send')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.CS_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send notification to user(s) (admin)' })
  @ApiResponse({ status: 200, description: 'Notifications sent' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    const responseModel = new ResponseModel();
    const result = await this.notificationsService.sendNotification(dto);
    responseModel.setData(result);
    return responseModel;
  }

  @Get()
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiResponse({ status: 200, description: 'Notifications list' })
  async list(@Req() req: AuthenticatedRequest, @Query() query: QueryNotificationsDto) {
    const responseModel = new ResponseModel();
    const result = await this.notificationsService.list(req.user.sub, query);
    responseModel.setData(result);
    return responseModel;
  }

  @Patch('read-all')
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All marked as read' })
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    const responseModel = new ResponseModel();
    const result = await this.notificationsService.markAllAsRead(req.user.sub);
    responseModel.setData(result);
    return responseModel;
  }

  @Patch(':id/read')
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const responseModel = new ResponseModel();
    const result = await this.notificationsService.markAsRead(req.user.sub, id);
    responseModel.setData(result);
    return responseModel;
  }
}
