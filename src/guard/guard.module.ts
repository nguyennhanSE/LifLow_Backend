import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './role.guard';
import { PermissionsGuard } from './permission.guard';
import { LoggerModule } from 'libs/logger/logger.module';
import { PermissionsModule } from 'src/modules/permissions/permissions.module';
import { config } from 'libs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (): Promise<JwtModuleOptions> => Promise.resolve({
        secret: config.JWT_SECRET_ACCESS_TOKEN,
        signOptions: { expiresIn: config.JWT_TOKEN_EXPIRATION_TIME as unknown as number },
      }),
      global: true,
    }),
    LoggerModule,
    PermissionsModule,
  ],
  providers: [AuthGuard, RolesGuard, PermissionsGuard],
  exports: [AuthGuard, RolesGuard, PermissionsGuard],
})
export class GuardModule {}
