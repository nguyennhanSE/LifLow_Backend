// sse/sse.service.ts
import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { AuthService } from 'src/modules/auth/auth.service';

export interface SseClient {
  subject: Subject<MessageEvent>;
}

@Injectable()
export class SseService {
  // Map<userId, Subject>
  private clients = new Map<string, SseClient>();

  constructor(private readonly authService : AuthService) {}

  subscribe(userId: string): Observable<MessageEvent> {
    // Nếu đã có connection cũ → đóng lại
    if (this.clients.has(userId)) {
      this.clients.get(userId)!.subject.unsubscribe();
      this.clients.delete(userId);
    }

    const subject = new Subject<MessageEvent>();
    this.clients.set(userId, { subject });

    return subject.asObservable();
  }

  emit(userId: string, data: object) {
    const client = this.clients.get(userId);
    if (!client) return;

    client.subject.next({
      data: JSON.stringify(data),
    } as MessageEvent);
  }

  remove(userId: string) {
    const client = this.clients.get(userId);
    if (!client) return;

    client.subject.unsubscribe();
    this.clients.delete(userId);
  }

  async validateTokenWithAuth(token: string) {
    return await this.authService.validateToken(token);
  }

  // Debug — xem có bao nhiêu client đang connect
  getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }
}