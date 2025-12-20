import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    InternalServerErrorException,
  } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppLogger } from 'libs/logger';
import { Request } from 'express';
import { TokenPayload } from 'libs/constants/interface';
import { PERMISSIONS_KEY } from 'libs/decorator/permissions.decorator';
import { ALL_PERMISSIONS, EPermissions } from 'src/modules/permissions/enum/permissions.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly context = PermissionsGuard.name;

  constructor(
    private readonly reflector: Reflector,
    private readonly logger: AppLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      this.logger.debug(
        `[${this.context}] No permissions required for this route`,
      );
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: TokenPayload } >();
    const user = request.user as TokenPayload;

    if (!user || !user.sub) {
      this.logger.warn(`[${this.context}] No user found in request`);
      throw new ForbiddenException('User not authenticated');
    }

    try {   
        if (!ALL_PERMISSIONS.some((permission) => requiredPermissions.includes(permission))) {
            this.logger.warn(`[${this.context}] User does not have required permissions`, {
                userId: user.sub,
                requiredPermissions,
            });
            throw new ForbiddenException('User does not have required permissions');    
        }
    } catch (error) {
        this.logger.error(`[${this.context}] Error checking permissions`, { error: error.message });
        throw new InternalServerErrorException('Error checking permissions');
    }
    return true;
  }
}