import { Message, User } from '@prisma/client';
import { MessageEntity, RoomEntity } from '../entities/chat.entity';

export class RoomWithRelations {
    id!: string;
    user1Id!: string;
    user2Id?: string | null;
    lastMessageAt?: Date | null;
    createdAt!: Date;
    updatedAt!: Date;

    // Relations
    user1?: User | null;
    user2?: User | null;
    messages?: (Message & {
        sender: User | null;
    })[] | null;
}

export class MessageWithRelations {
    id!: string;
    roomId!: string;
    senderId?: string | null;
    content!: string;
    isRead!: boolean;
    createdAt!: Date;
    updatedAt!: Date;

    // Relations
    room?: RoomEntity | null;
    sender?: User | null;
}

export function toRoomEntity(room: RoomWithRelations): RoomEntity {
    return {
        id: room.id,
        user1Id: room.user1Id,
        user2Id: room.user2Id,
        lastMessageAt: room.lastMessageAt,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        user1: room.user1 ? {
            id: room.user1.id,
            name: room.user1.name ?? '',
            email: room.user1.email ?? undefined,
        } : null,
        user2: room.user2 ? {
            id: room.user2.id,
            name: room.user2.name ?? '',
            email: room.user2.email ?? undefined,
        } : null,
        messages: room.messages ? room.messages.map(msg => ({
            id: msg.id,
            roomId: msg.roomId,
            senderId: msg.senderId,
            content: msg.content,
            isRead: msg.isRead,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt,
            sender: msg.sender ? {
                id: msg.sender.id,
                name: msg.sender.name ?? '',
                email: msg.sender.email ?? undefined,
            } : null,
        })) : null,
    };  
}



export function toMessageEntity(message: MessageWithRelations): MessageEntity {
    return {
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        room: message.room ? {
            id: message.room.id,
            user1Id: message.room.user1Id,
            user2Id: message.room.user2Id,
            lastMessageAt: message.room.lastMessageAt,
            createdAt: message.room.createdAt,
            updatedAt: message.room.updatedAt,
        } : null,
        sender: message.sender ? {
            id: message.sender.id,
            name: message.sender.name ?? '',
            email: message.sender.email ?? undefined,
        } : null,

    };
}
