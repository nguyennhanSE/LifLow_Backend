import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "prisma/prisma.service";
import { AppLogger } from "src/libs/logger/logger.service";
import { GetRoomsQueryDto } from "../../dto/chat-event.dto";
import { MessageEntity, RoomEntity } from "../entities/chat.entity";
import { toMessageEntity, toRoomEntity } from "../mapper/chat.mapper";

@Injectable()
export class ChatRepository {
    private readonly roomInclude = {
        user1: true,
        user2: true,
        messages: {
            orderBy: { createdAt: 'desc' },
            include: { sender: true },
        },
    } satisfies Prisma.RoomInclude;

    private readonly roomWithLastMessageInclude = {
        user1: true,
        user2: true,
        messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: true },
        },
    } satisfies Prisma.RoomInclude;

    constructor(private readonly logger: AppLogger,
                private readonly prisma : PrismaService
    ) {}
    async getAllRooms(dto : GetRoomsQueryDto) : Promise<RoomEntity[] | null> {
        this.logger.debug(`Getting all rooms with query: ${JSON.stringify(dto)}`);
        const { page = 1, limit = 10, q, sortBy = 'lastMessageAt', sortOrder = 'desc' } = dto;
        const skip = (page - 1) * limit;
        const orderBy = { [sortBy]: sortOrder };

        try {
            const rooms = await this.prisma.room.findMany({
                where: q ? {
                    OR: [
                        { user1: { name: { contains: q, mode: 'insensitive' } } },
                        { user2: { name: { contains: q, mode: 'insensitive' } } },
                    ],
                } : undefined,
                orderBy,
                skip,
                take: limit,
                include: this.roomWithLastMessageInclude,
            });
            return rooms.map(toRoomEntity);
        } catch (error) {
            this.logger.error(`Failed to get rooms: ${error}`);
            throw error;
        }
    }
    async getRoomById(roomId: string): Promise<RoomEntity | null> {
        // this.logger.debug(`Getting room by ID: ${roomId}`);
        try {
            const room = await this.prisma.room.findUnique({
                where: { id: roomId },
                include: this.roomInclude,
            });
            return room ? toRoomEntity(room) : null;
        } catch (error) {
            this.logger.error(`Failed to get room by ID: ${error}`);
            throw error;
        }
    }

    async createRoom(user1Id: string): Promise<RoomEntity> {
        this.logger.debug(`Creating room for user: ${user1Id}`);
        try {
            const room = await this.prisma.room.create({
                data: {
                    user1Id,
                    user2Id: null,
                },
                include: this.roomInclude,
            });

            return toRoomEntity(room);
        } catch (error) {
            this.handlePrismaError(error, 'Failed to create room');
        }
    }

    async joinRoom(roomId: string, userId: string): Promise<RoomEntity> {
        this.logger.debug(`Joining room ${roomId} for user: ${userId}`);
        try {
            return await this.prisma.$transaction(async (tx) => {
                const room = await tx.room.findUnique({
                    where: { id: roomId },
                    include: this.roomInclude,
                });

                if (!room) {
                    throw new NotFoundException(`Room with ID ${roomId} not found`);
                }

                if (room.user1Id === userId || room.user2Id === userId) {
                    return toRoomEntity(room);
                }

                if (room.user2Id) {
                    throw new ConflictException('Room is already full');
                }

                const updateResult = await tx.room.updateMany({
                    where: {
                        id: roomId,
                        user2Id: null,
                    },
                    data: {
                        user2Id: userId,
                    },
                });

                if (updateResult.count === 0) {
                    throw new ConflictException('Room is no longer available');
                }

                const updatedRoom = await tx.room.findUnique({
                    where: { id: roomId },
                    include: this.roomInclude,
                });

                if (!updatedRoom) {
                    throw new NotFoundException(`Room with ID ${roomId} not found`);
                }

                return toRoomEntity(updatedRoom);
            });
        } catch (error) {
            this.handlePrismaError(error, 'Failed to join room');
        }
    }

    async createMessage(roomId: string, senderId: string, content: string): Promise<MessageEntity> {
        this.logger.debug(`Creating message in room ${roomId} for sender: ${senderId}`);
        try {
            return await this.prisma.$transaction(async (tx) => {
                const room = await tx.room.findUnique({
                    where: { id: roomId },
                    select: {
                        id: true,
                        user1Id: true,
                        user2Id: true,
                    },
                });

                if (!room) {
                    throw new NotFoundException(`Room with ID ${roomId} not found`);
                }

                if (room.user1Id !== senderId && room.user2Id !== senderId) {
                    throw new ForbiddenException('Cannot send message to a room you have not joined');
                }

                const message = await tx.message.create({
                    data: {
                        roomId,
                        senderId,
                        content,
                    },
                    include: {
                        sender: true,
                    },
                });

                await tx.room.update({
                    where: { id: roomId },
                    data: { lastMessageAt: message.createdAt },
                });

                return toMessageEntity(message);
            });
        } catch (error) {
            this.handlePrismaError(error, 'Failed to create message');
        }
    }

    private handlePrismaError(error: unknown, defaultMessage: string): never {
        if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof ForbiddenException) {
            throw error;
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new ConflictException('Room already exists for these users');
            }

            if (error.code === 'P2003' || error.code === 'P2025') {
                throw new NotFoundException('Related user or room not found');
            }
        }

        this.logger.error(`${defaultMessage}: ${error}`);
        throw error;
    }
    async getAllUserRooms(userId: string, dto : GetRoomsQueryDto) : Promise<RoomEntity[] | null> {
        // this.logger.debug(`Getting rooms for user ${userId} with query: ${JSON.stringify(dto)}`);
        const { page = 1, limit = 10, q, sortBy = 'lastMessageAt', sortOrder = 'desc' } = dto;
        const skip = (page - 1) * limit;
        const orderBy = { [sortBy]: sortOrder };

        try {
            const rooms = await this.prisma.room.findMany({
                where: {
                    OR: [
                        { user1Id: userId },
                        { user2Id: userId },
                    ],
                    AND: q ? {
                        OR: [
                            { user1: { name: { contains: q, mode: 'insensitive' } } },
                            { user2: { name: { contains: q, mode: 'insensitive' } } },
                        ],
                    } : undefined,
                },
                orderBy,
                skip,
                take: limit,
                include: this.roomWithLastMessageInclude,
            });
            return rooms.map(toRoomEntity);
        } catch (error) {
            this.logger.error(`Failed to get rooms for user ${userId}: ${error}`);
            throw error;
        }
    }
}
