import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AppLogger } from "src/libs/logger/logger.service";
import { ChatRepository } from "../repositories/chat.repository";
import { GetRoomsQueryDto } from "../../dto/chat-event.dto";
import { MessageEntity, RoomEntity } from "../entities/chat.entity";

@Injectable()
export class ChatService {
    // Add your chat service methods here
    constructor(
        private readonly logger: AppLogger,
        private readonly chatRepository: ChatRepository
    ) {}
    async getAllRooms(dto : GetRoomsQueryDto) : Promise<RoomEntity[] | null> {
        this.logger.debug(`Getting all rooms with query: ${JSON.stringify(dto)}`);
        return this.chatRepository.getAllRooms(dto);
    }
    async getUserRooms(userId: string, dto : GetRoomsQueryDto) : Promise<RoomEntity[] | null> {
        // this.logger.debug(`Getting rooms for user ${userId} with query: ${JSON.stringify(dto)}`);
        const rooms = await this.chatRepository.getAllUserRooms(userId, dto);
        return rooms;
    }
    async getRoomById(roomId: string): Promise<RoomEntity | null> {
        this.logger.debug(`Getting room by ID: ${roomId}`);
        return this.chatRepository.getRoomById(roomId);
    }

    async createRoom(userId: string): Promise<RoomEntity> {
        this.logger.debug(`Creating room for user: ${userId}`);
        return this.chatRepository.createRoom(userId);
    }

    async joinRoom(roomId: string, userId: string): Promise<RoomEntity> {
        this.logger.debug(`Joining room ${roomId} for user: ${userId}`);
        const room = await this.chatRepository.getRoomById(roomId);

        if (!room) {
            throw new NotFoundException(`Room with ID ${roomId} not found`);
        }

        if (room.user1Id === userId || room.user2Id === userId) {
            return room;
        }

        if (room.user2Id) {
            throw new ConflictException('Room is already full');
        }

        return this.chatRepository.joinRoom(roomId, userId);
    }
    async sendMessage(roomId: string, senderId: string, content: string): Promise<MessageEntity> {
        this.logger.debug(`Sending message to room ${roomId} for user: ${senderId}`);
        return this.chatRepository.createMessage(roomId, senderId, content);
    }
    async isValidRoom(roomId: string): Promise<boolean> {
        this.logger.debug(`Checking if room ${roomId} is valid`);
        const room = await this.chatRepository.getRoomById(roomId);
        return !!room && !!room.user1Id;
    }
    async isRoomAvailable(roomId: string): Promise<boolean> {
        this.logger.debug(`Checking if room ${roomId} is available`);
        const room = await this.chatRepository.getRoomById(roomId);
        return !!room && !room.user2Id;
    }
    async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
        this.logger.debug(`Checking if user ${userId} is in room ${roomId}`);
        const room = await this.chatRepository.getRoomById(roomId);
        return !!room && (room.user1Id === userId || room.user2Id === userId);
    }
}
