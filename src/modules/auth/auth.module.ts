import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'prisma/prisma.module';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { UserModule } from '../user/user.module';
import { RolesModule } from '../roles/roles.module';
import { AuthRepository } from './repositories/auth.repository';
import { HttpModule } from '@nestjs/axios';
import { KakaoController } from './kakao.controller';
import { KakaoOAuthService } from './kakao-oauth.service';
import { NaverController } from './naver.controller';
import { NaverOAuthService } from './naver-oauth.service';

@Module({
  imports: [JwtModule, PrismaModule, LoggerModule, UserModule, RolesModule, HttpModule],
  controllers: [AuthController, KakaoController, NaverController],
  providers: [AuthService, AuthRepository, KakaoOAuthService, NaverOAuthService],
  exports: [AuthService, AuthRepository],
})
export class AuthModule {}
