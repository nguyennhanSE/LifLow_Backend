import { Body, Controller, Post, Req } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto, RefreshTokenRequestDto } from './dto/auth.dto';
import { Public } from 'src/libs/decorator/public.decorator';
import { UserEventType } from 'src/libs/decorator';
import { ResponseModel } from 'src/libs/models/response/response.model';
import { AppLogger } from 'src/libs/logger';
import { UserEventLogQueueService } from '../user-event-log/queue/user-event-log.queue.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userEventLogQueueService: UserEventLogQueueService,
    private readonly logger: AppLogger,
  ) {}

  @Post('login')
  @Public()
  async login(@Body() loginDto: LoginDto, @Req() request: Request) {
    const responseModel = new ResponseModel();
    try {
      const result = await this.authService.login(loginDto);
      this.enqueueAuthEvent('login', result.user?.id ?? null, request);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
  @Post('logout')
  @Public()
  async logout(@Body() logoutDto: LogoutDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.authService.logout(logoutDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
  @Post('refresh-token')
  @Public()
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenRequestDto,
    @Req() request: Request,
  ) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.authService.refreshToken(refreshTokenDto);
      const { userId, ...responseData } = result;
      this.enqueueAuthEvent('refresh_token', userId ?? null, request);
      responseModel.setData(responseData);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  private enqueueAuthEvent(
    action: 'login' | 'refresh_token',
    userId: string | null,
    request: Request,
  ) {
    void this.userEventLogQueueService
      .enqueueUserEventLog({
        eventId: randomUUID(),
        eventType: UserEventType.AUTH_EVENT,
        eventVersion: 1,
        userId,
        anonymousId: this.getHeader(request.headers['x-anonymous-id']) ?? null,
        sessionId: this.getHeader(request.headers['x-session-id']) ?? null,
        entityType: 'session',
        entityId: null,
        source: 'web',
        ip: this.getClientIp(request),
        userAgent: this.getHeader(request.headers['user-agent']) ?? null,
        requestId:
          this.getHeader(request.headers['x-request-id']) ??
          this.getHeader(request.headers['request-id']) ??
          null,
        traceId:
          this.getHeader(request.headers['x-trace-id']) ??
          this.getHeader(request.headers['trace-id']) ??
          null,
        metadata: {
          action,
          method: request.method,
          path: request.originalUrl ?? request.url,
        },
        occurredAt: new Date().toISOString(),
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[AuthController] Failed to enqueue auth event ${action}: ${message}`,
        );
      });
  }

  private getHeader(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private getClientIp(request: Request): string | null {
    const forwardedFor = this.getHeader(request.headers['x-forwarded-for']);
    if (forwardedFor) {
      return forwardedFor.split(',')[0]?.trim() || null;
    }

    return request.ip ?? request.socket?.remoteAddress ?? null;
  }
}
