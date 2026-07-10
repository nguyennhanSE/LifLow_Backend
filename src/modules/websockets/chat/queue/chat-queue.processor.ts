import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'prisma/prisma.service';
import { AppLogger } from 'src/libs/logger/logger.service';
import { ERoleName } from 'src/modules/roles/enums/role.enum';
import { CHAT_QUEUE_JOB_NAME, CHAT_QUEUE_NAME } from './chat-queue.constant';
import { CreateChatRoomsForUsersJobData } from './chat-queue.service';

@Processor(CHAT_QUEUE_NAME)
export class ChatQueueProcessor extends WorkerHost {
    constructor(
        private readonly logger: AppLogger,
        private readonly prisma: PrismaService,
    ) {
        super();
    }

    async process(job: Job<CreateChatRoomsForUsersJobData>): Promise<unknown> {
        switch (job.name) {
            case CHAT_QUEUE_JOB_NAME:
                return this.createChatRoomsForUsers(job.data.id);
            default:
                this.logger.warn(`[ChatQueue] Unknown job name: ${job.name}`);
                return;
        }
    }

    private async createChatRoomsForUsers(id: string) {
        this.logger.log(`[ChatQueue] Creating chat rooms for admin/user id=${id}`);

        const creator = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!creator) {
            this.logger.warn(`[ChatQueue] Creator user ${id} not found, skipping room creation`);
            return {
                success: false,
                id,
                error: 'Creator user not found',
            };
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const users = await tx.user.findMany({
                where: {
                    id: { not: id },
                    userRole: {
                        some: {
                            role: {
                                name: ERoleName.USER,
                            },
                        },
                    },
                },
                select: { id: true },
            });

            if (users.length === 0) {
                return {
                    totalUsers: 0,
                    createdRooms: 0,
                };
            }

            const createResult = await tx.room.createMany({
                data: users.map((user) => ({
                    user1Id: id,
                    user2Id: user.id,
                })),
                skipDuplicates: true,
            });

            return {
                totalUsers: users.length,
                createdRooms: createResult.count,
            };
        });

        if (result.totalUsers === 0) {
            this.logger.log(`[ChatQueue] No USER role users found for creator ${id}`);
        }

        this.logger.log(
            `[ChatQueue] Created ${result.createdRooms}/${result.totalUsers} chat rooms for creator ${id}`,
        );

        return {
            success: true,
            id,
            totalUsers: result.totalUsers,
            createdRooms: result.createdRooms,
        };
    }
}
