import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { ChatModule } from './chat/chat.module';
import { ChatGateway } from './gateways/chat.gateway';

@Module({
  imports: [ChatModule, AuthModule, LoggerModule],
  providers: [ChatGateway],
})
export class WebsocketModule {}
