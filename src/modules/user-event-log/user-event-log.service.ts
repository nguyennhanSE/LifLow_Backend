import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from 'prisma/prisma.service';
import { config, NODE_ENV } from 'src/libs/config';
import { AppLogger } from 'src/libs/logger/logger.service';
import { UserEventLogJobData } from './queue/user-event-log.queue.service';

@Injectable()
export class UserEventLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  async recordEvent(data: UserEventLogJobData) {
    const persistedEvent = await this.persistEvent(data);
    const lokiResult = await this.pushEventToLoki(data);

    await this.prisma.userEventLog.update({
      where: { eventId: data.eventId },
      data: lokiResult.success
        ? {
            lokiPushedAt: new Date(),
            lokiPushError: null,
          }
        : {
            lokiPushError: lokiResult.error,
          },
    });

    return {
      persistedEvent,
      lokiPushed: lokiResult.success,
    };
  }

  private async persistEvent(data: UserEventLogJobData) {
    try {
      return await this.prisma.userEventLog.create({
        data: {
          eventId: data.eventId,
          eventType: data.eventType,
          eventVersion: data.eventVersion,
          userId: data.userId ?? undefined,
          anonymousId: data.anonymousId ?? undefined,
          sessionId: data.sessionId ?? undefined,
          entityType: data.entityType ?? undefined,
          entityId: data.entityId ?? undefined,
          source: data.source ?? undefined,
          ip: data.ip ?? undefined,
          userAgent: data.userAgent ?? undefined,
          requestId: data.requestId ?? undefined,
          traceId: data.traceId ?? undefined,
          metadata: data.metadata as Prisma.InputJsonValue,
          occurredAt: new Date(data.occurredAt),
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `[UserEventLog] Duplicate event ignored: eventId=${data.eventId}`,
        );
        return this.prisma.userEventLog.findUnique({
          where: { eventId: data.eventId },
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[UserEventLog] Failed to persist event ${data.eventId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async pushEventToLoki(
    data: UserEventLogJobData,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const timestamp = this.toLokiTimestamp(data.occurredAt);
    const logLine = JSON.stringify({
      ...data,
    });

    try {
      await axios.post(`${config.LOKI_BASE_URL}/loki/api/v1/push`, {
        streams: [
          {
            stream: {
              app: 'liflow-be',
              // env: NODE_ENV,
              log_type: 'user_event',
              event_type: data.eventType,
              source: data.source ?? 'unknown',
            },
            values: [[timestamp, logLine]],
          },
        ],
      });

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[UserEventLog] Failed to push event ${data.eventId} to Loki: ${message}`,
      );

      return { success: false, error: message };
    }
  }

  private toLokiTimestamp(occurredAt: string): string {
    const milliseconds = Date.parse(occurredAt);
    const safeMilliseconds = Number.isNaN(milliseconds) ? Date.now() : milliseconds;

    return (BigInt(safeMilliseconds) * 1_000_000n).toString();
  }
}
