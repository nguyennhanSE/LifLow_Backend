import {
  Controller,
  Sse,
  Param,
  Query,
  UnauthorizedException,
  OnModuleDestroy,
  Req,
  MessageEvent,
} from '@nestjs/common';
import { Observable, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SseService } from './sse.service';
import { Public } from '../decorator';

@Controller('sse')
export class SseController implements OnModuleDestroy {
  constructor(private sseService: SseService) {}

  @Public()
  @Sse('events/:userId')
  async stream(
    @Param('userId') userId: string,
    @Query('token') token: string,
    @Req() req: Request,
  ): Promise<Observable<MessageEvent>> {
    if (!token) throw new UnauthorizedException('No token provided');

    // Fix 1: tách try/catch — chỉ bắt lỗi từ validateToken
    let payload: { sub: string; exp?: number };
    try {
      payload = await this.sseService.validateTokenWithAuth(token);
      console.log('payload:', payload);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    // Fix 2: validate nằm ngoài try/catch
    if (payload.sub !== userId) {
      throw new UnauthorizedException('Token does not match user ID');
    }

    if ((payload.exp ?? 0) * 1000 < Date.now()) {
      throw new UnauthorizedException('Token expired');
    }

    const stream$ = this.sseService.subscribe(userId);
    const socket = (req as unknown as { socket: import('net').Socket }).socket;
    const close$ = fromEvent(socket, 'close');

    close$.subscribe(() => {
      console.log('SSE disconnect:', userId);
      this.sseService.remove(userId);
    });

    return stream$.pipe(takeUntil(close$));
  }

  onModuleDestroy() {
    this.sseService.getConnectedUsers().forEach(id => this.sseService.remove(id));
  }
}