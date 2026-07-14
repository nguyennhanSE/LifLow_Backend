import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "src/libs/decorator/roles.decorator";
import { ResponseModel } from "src/libs/models/response/response.model";
import { ERoleName } from "src/modules/roles/enums/role.enum";
import { CreateRoomDto, GetRoomsQueryDto } from "../dto/chat-event.dto";
import { ChatQueueService } from "./queue/chat-queue.service";
import { ChatService } from "./services/chat.service";

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
    constructor(
        private readonly chatQueueService: ChatQueueService,
        private readonly chatService: ChatService,
    ) {}

    @Post('rooms')
    @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a waiting chat room for users to join' })
    @ApiBody({ type: CreateRoomDto })
    @ApiResponse({
        status: 201,
        description: 'Chat room created successfully',
    })
    async createRoom(
        @Req() req: Request & { user: { sub: string } },
        @Body() _dto: CreateRoomDto,
    ) {
        const responseModel = new ResponseModel();
        const job = await this.chatQueueService.enqueueCreateChatRoomsForUsers(req.user.sub);

        responseModel.setData({
            jobId: job.id,
            name: job.name,
        });
        return responseModel;
    }

    @Get('users/:userId/rooms')
    @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.CS_MANAGER, ERoleName.USER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get chat rooms by user id' })
    @ApiParam({ name: 'userId', type: String, description: 'User ID' })
    @ApiResponse({
        status: 200,
        description: 'Chat rooms retrieved successfully',
    })
    async getRoomsByUserId(
        @Req() req: Request & { user: { sub: string; roles?: string[] } },
        @Param('userId') userId: string,
        @Query() query: GetRoomsQueryDto,
    ) {
        if (!this.canViewUserRooms(req.user, userId)) {
            throw new ForbiddenException('Cannot view other users chat rooms');
        }

        const responseModel = new ResponseModel();
        const rooms = await this.chatService.getUserRooms(userId, query);

        responseModel.setData(rooms);
        return responseModel;
    }

    private canViewUserRooms(user: { sub: string; roles?: string[] }, userId: string): boolean {
        return (
            user.sub === userId ||
            !!user.roles?.some((role) =>
                [ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.CS_MANAGER].includes(role as ERoleName),
            )
        );
    }

    
}
