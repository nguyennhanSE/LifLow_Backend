import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AppEventEmitterService {
  constructor(private eventEmitter: EventEmitter2) {}

  emit(event: string, payload: unknown): void {
    this.eventEmitter.emit(event, payload);
  }

  async emitAsync(event: string, payload: unknown): Promise<unknown[]> {
    return await this.eventEmitter.emitAsync(event, payload);
  }

  on(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}