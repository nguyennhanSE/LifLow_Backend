import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SseService } from './sse.service';
import { SseController } from './sse.controller';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [SseController],
    providers: [SseService],
    exports: [SseService], 
})
export class SseModule {}