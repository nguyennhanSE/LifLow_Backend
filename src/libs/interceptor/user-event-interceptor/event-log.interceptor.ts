import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { Observable, tap } from 'rxjs';
import { AppLogger } from '../../logger';
import { UserEventLogQueueService } from 'src/modules/user-event-log/queue/user-event-log.queue.service';
import {
  EVENT_LOG_METADATA_KEY,
  EventLogMetadata,
} from './event-log.metadata';

@Injectable()
export class EventLogInterceptor<T> implements NestInterceptor<T> {
  private readonly context = EventLogInterceptor.name
  constructor(
    private readonly reflector: Reflector,
    private readonly loggerService: AppLogger,
    private readonly userEventLogQueueService: UserEventLogQueueService,

  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<T> {
    const metadata = this.reflector.getAllAndOverride<EventLogMetadata>(
      EVENT_LOG_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata || context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<TrackedRequest>();

    return next.handle().pipe(
      tap((responseBody) => {
        const event = this.buildEvent(metadata, request, responseBody);

        void this.userEventLogQueueService
          .enqueueUserEventLog(event)
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            this.loggerService.error(
              `[EventLogInterceptor] Failed to enqueue event ${event.eventType}: ${message}`,
            );
          });
      }),
    );
  }

  private buildEvent(
    metadata: EventLogMetadata,
    request: TrackedRequest,
    responseBody: unknown,
  ) {
    const headers = request.headers;
    const userAgent = this.getHeader(headers['user-agent']);
    const requestId =
      this.getHeader(headers['x-request-id']) ?? this.getHeader(headers['request-id']);
    const traceId =
      this.getHeader(headers['x-trace-id']) ?? this.getHeader(headers['trace-id']);
    const sessionId =
      this.getHeader(headers['x-session-id']) ?? this.getHeader(headers['session-id']);
    const anonymousId =
      this.getHeader(headers['x-anonymous-id']) ??
      this.getHeader(headers['anonymous-id']);
    this.loggerService.debug(` [${this.context}] data: ${JSON.stringify(request.user)}`);

    return {
      eventId: randomUUID(),
      eventType: metadata.eventType,
      eventVersion: 1,
      userId: request.user?.sub ?? null,
      anonymousId: anonymousId ?? null,
      sessionId: sessionId ?? null,
      entityType: metadata.entityType ?? metadata.eventEntity ?? null,
      entityId:
        metadata.entityId ??
        this.resolvePath(metadata.entityIdFrom, request, responseBody) ??
        null,
      source: metadata.source ?? 'web',
      ip: this.getClientIp(request),
      userAgent: userAgent ?? null,
      requestId: requestId ?? null,
      traceId: traceId ?? null,
      metadata: {
        ...metadata.metadata,
        method: request.method,
        path: request.originalUrl ?? request.url,
      },
      occurredAt: new Date().toISOString(),
    };
  }

  private resolvePath(
    path: string | undefined,
    request: TrackedRequest,
    responseBody: unknown,
  ): string | null {
    if (!path) {
      return null;
    }

    const value = path.split('.').reduce<unknown>(
      (current, key) =>
        current && typeof current === 'object'
          ? (current as Record<string, unknown>)[key]
          : undefined,
      {
        params: request.params,
        query: request.query,
        body: request.body,
        user: request.user,
        response: responseBody,
      },
    );

    if (value === null || value === undefined) {
      return null;
    }

    return this.stringifyResolvedValue(value);
  }

  private stringifyResolvedValue(value: unknown): string | null {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  private getHeader(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private getClientIp(request: TrackedRequest): string | null {
    const forwardedFor = this.getHeader(request.headers['x-forwarded-for']);
    if (forwardedFor) {
      return forwardedFor.split(',')[0]?.trim() || null;
    }

    return request.ip ?? request.socket?.remoteAddress ?? null;
  }
}

type TrackedRequest = Request & {
  user?: {
    sub?: string;
    email?: string;
    roles?: string[];
  };
};
