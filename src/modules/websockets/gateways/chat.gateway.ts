import { UnauthorizedException, UsePipes, ValidationPipe } from "@nestjs/common";
import {config} from "../../../libs/config";
import {ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException} from "@nestjs/websockets";
import {Namespace, Socket} from "socket.io";
import {ChatService} from "../chat/services/chat.service";
import {AppLogger} from "src/libs/logger/logger.service";
import { AuthService } from "src/modules/auth/auth.service";
import { CreateRoomDto, IsTypingDto, JoinRoomDto, SendMessageDto } from "../dto/chat-event.dto";
import { tokenType } from "src/common/enums";

@WebSocketGateway({
    namespace: 'chat',
    cors: {
        origin: config.FRONTEND_URL,
        // methods: ['GET', 'POST'],
        // credentials: true,
    },
})

// @UseGuards(WsAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    private readonly server!: Namespace;
    private readonly userSockets = new Map<string, Set<string>>();

    constructor(
        private readonly chatService: ChatService,
        private readonly logger: AppLogger,
        private readonly authService: AuthService
    ) { }

    async handleConnection(client: Socket) {
        try {
            const userId = await this.getAuthenticatedUserId(client);
            client.data.userId = userId;

            // await client.join(this.getUserRoomName(userId));
            this.addUserSocket(userId, client.id);

            const allUserOnlineIds = Array.from(this.userSockets.keys());
            this.server.emit('chat:userOnline', { allUserOnlineIds });
        
            this.logger.debug(`[ChatGateway] All connected clients: ${JSON.stringify(Array.from(this.userSockets.entries()).map(([userId, sockets]) => ({ userId, socketCount: sockets.size })))}`);

            // this.logger.debug(`[ChatGateway] Client connected: ${client.id}, userId: ${userId}`);
        } catch (error) {
            this.logger.warn(
                `[ChatGateway] Unauthorized client disconnected: ${client.id}. ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            client.disconnect(true);
        }
    }


    handleDisconnect(client: Socket) {
        const userId = this.getSocketUserId(client);
        const joinedRooms = [...client.rooms].filter((room) => room !== client.id);

        if (userId) {
            const isLastConnection = this.removeUserSocket(userId, client.id);
            delete client.data.userId;

            if (isLastConnection) {
                this.server.emit('chat:userOffline', { userId });
            }
        }

        this.logger.debug(
            `[ChatGateway] Client disconnected: ${client.id}, userId: ${userId ?? 'unknown'}, rooms: ${joinedRooms.join(', ') || 'none'}`,
        );
    }

    @SubscribeMessage('chat:createRoom')
    async createRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() _dto: CreateRoomDto,
    ) {
        const userId = await this.getSocketOrAuthenticatedUserId(client);
        const room = await this.chatService.createRoom(userId);

        await client.join(room.id);
        client.emit('chat:roomCreated', room);

        return room;
    }

    @SubscribeMessage('chat:joinRoom')
    async joinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: JoinRoomDto,
    ) {
        this.logger.log(`[ChatGateway] chat:joinRoom received: socketId=${client.id}, dto=${JSON.stringify(dto)}`);

        try {
            const userId = await this.getSocketOrAuthenticatedUserId(client);
            this.logger.log(`[ChatGateway] chat:joinRoom authenticated: socketId=${client.id}, userId=${userId}`);

            const room = await this.chatService.joinRoom(dto.roomId, userId);
            this.logger.log(`[ChatGateway] chat:joinRoom service resolved: roomId=${room.id}`);

            await client.join(room.id);
            this.logger.log(`[ChatGateway] socket joined room: socketId=${client.id}, roomId=${room.id}`);
            this.logRealRooms();
            this.server.to(room.id).emit('chat:userJoinedRoom', room);

            return room;
        } catch (error) {
            this.logger.error(
                `[ChatGateway] chat:joinRoom failed: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    @SubscribeMessage('chat:sendMessage')
    async sendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: SendMessageDto,
    ) {
        this.logger.log(`[ChatGateway] chat:sendMessage received: socketId=${client.id}, dto=${JSON.stringify(dto)}`);

        try {
            const userId = await this.getSocketOrAuthenticatedUserId(client);
            const isInRoom = this.isInRoom(client, dto.roomId);

            if (!isInRoom) {
                throw new WsException("You must join the room before sending messages");
            }
            const message = await this.chatService.sendMessage(dto.roomId, userId, dto.content);

            // await client.join(dto.roomId);
            this.server.to(dto.roomId).emit('chat:messageCreated', message);

            return message;
        } catch (error) {
            this.logger.error(
                `[ChatGateway] chat:sendMessage failed: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    @SubscribeMessage('chat:isTyping')
    async isTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: IsTypingDto,
    ) {
        this.logger.log(`[ChatGateway] chat:isTyping received: socketId=${client.id}, dto=${JSON.stringify(dto)}`);

        try {
            const userId = await this.getSocketOrAuthenticatedUserId(client);
            const isInRoom = this.isInRoom(client, dto.roomId);

            if (!isInRoom) {
                throw new WsException("You must join the room before indicating typing status");
            }

            this.server.to(dto.roomId).emit('chat:userIsTyping', { userId, isTyping: dto.isTyping === 'true' });
        } catch (error) {
            this.logger.error(
                `[ChatGateway] chat:isTyping failed: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    @SubscribeMessage('chat:queryMessages')
    async queryMessages(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: { roomId: string; limit: number; cursor?: { id: string; createdAt: Date } },
    ) {
        this.logger.log(`[ChatGateway] chat:queryMessages received: socketId=${client.id}, dto=${JSON.stringify(dto)}`);

        try {
            const userId = await this.getSocketOrAuthenticatedUserId(client);
            const isInRoom = this.isInRoom(client, dto.roomId);

            if (!isInRoom) {
                throw new WsException("You must join the room before querying messages");
            }

            const messages = await this.chatService.getRoomMessages(dto.roomId, dto.limit, dto.cursor);
            this.server.to(client.id).emit('chat:messagesQueried', messages);
        } catch (error) {
            this.logger.error(
                `[ChatGateway] chat:queryMessages failed: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    private isInRoom(client: Socket, roomId: string): boolean {
        const room = this.server.adapter.rooms.get(roomId);
        return room ? room.has(client.id) : false;
    }

    private logRealRooms() {
        const adapter = this.server.adapter;
        const rooms = [...adapter.rooms.entries()]
            .filter(([roomName]) => !adapter.sids.has(roomName))
            .map(([roomName, socketIds]) => ({
                roomName,
                sockets: [...socketIds],
            }));

        this.logger.log(`[ChatGateway] Real rooms: ${JSON.stringify(rooms)}`);
    }

    private async getSocketOrAuthenticatedUserId(client: Socket): Promise<string> {
        return this.getSocketUserId(client) ?? this.getAuthenticatedUserId(client);
    }

    private getSocketUserId(client: Socket): string | undefined {
        return typeof client.data?.userId === 'string' ? client.data.userId : undefined;
    }

    private getUserRoomName(userId: string): string {
        return `user:${userId}`;
    }

    private addUserSocket(userId: string, socketId: string): boolean {
        const sockets = this.userSockets.get(userId);

        if (sockets) {
            sockets.add(socketId);
            return false;
        }

        this.userSockets.set(userId, new Set([socketId]));
        return true;
    }

    private removeUserSocket(userId: string, socketId: string): boolean {
        const sockets = this.userSockets.get(userId);

        if (!sockets) {
            return true;
        }

        sockets.delete(socketId);

        if (sockets.size > 0) {
            return false;
        }

        this.userSockets.delete(userId);
        return true;
    }

    private async getAuthenticatedUserId(client: Socket): Promise<string> {
        const token = this.extractAccessToken(client);

        if (!token) {
            throw new WsException(new UnauthorizedException('Access token is required'));
        }

        try {
            const payload = await this.authService.validateToken(token);

            if (payload.tokenType !== tokenType.AccessToken) {
                throw new UnauthorizedException('Invalid token type');
            }

            return payload.sub;
        } catch (error) {
            throw new WsException(error instanceof Error ? error.message : 'Unauthorized');
        }
    }

    private extractAccessToken(client: Socket): string | undefined {
        const authToken = client.handshake.auth?.token || client.handshake.query?.token;
        const authorizationHeader = client.handshake.headers.authorization;
        const headerToken = Array.isArray(authorizationHeader)
            ? authorizationHeader[0]
            : authorizationHeader;

        return this.normalizeBearerToken(
            typeof authToken === 'string' ? authToken : headerToken,
        );
    }

    private normalizeBearerToken(token?: string): string | undefined {
        if (!token) {
            return undefined;
        }

        const [type, value] = token.split(' ');
        return type === 'Bearer' && value ? value : token;
    }
}
