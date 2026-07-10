import { Module } from "@nestjs/common";
import { LoggerModule } from "src/libs/logger/logger.module";
import { PrismaModule } from "prisma/prisma.module";
import { ChatService } from "./services/chat.service";
import { ChatRepository } from "./repositories/chat.repository";
import { ChatController } from "./chat.controller";
import { ChatQueueModule } from "./queue/chat-queue.module";

@Module({
    imports: [LoggerModule, PrismaModule, ChatQueueModule],
    controllers: [ChatController],
    providers: [ChatService, ChatRepository],
    exports: [ChatService, ChatRepository],
})

export class ChatModule {}
