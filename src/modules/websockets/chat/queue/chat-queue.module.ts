import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { PrismaModule } from 'prisma/prisma.module';
import { CHAT_QUEUE_NAME } from './chat-queue.constant';
import { ChatQueueProcessor } from './chat-queue.processor';
import { ChatQueueService } from './chat-queue.service';


@Module({
    imports: [
        LoggerModule,
        PrismaModule,
        BullModule.registerQueueAsync({
            name: CHAT_QUEUE_NAME,
            useFactory: () => ({
            defaultJobOptions: {
                removeOnComplete: 10,
                removeOnFail: 20,
                attempts: 3,
                backoff: {
                type: 'exponential',
                delay: 3000,
                },
                delay: 500, 
            },
            }),
        }),
    ],
    providers: [ChatQueueService, ChatQueueProcessor],
    exports: [ChatQueueService],

})
export class ChatQueueModule {}
