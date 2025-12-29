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
import { EPermissions } from 'src/modules/permissions/enum/permissions.enum';
import { PermissionsService } from 'src/modules/permissions/permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly context = PermissionsGuard.name;

  constructor(
    private readonly reflector: Reflector,
    private readonly logger: AppLogger,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      // Validate that all required permissions are valid EPermissions values
      const invalidPermissions = requiredPermissions.filter(
        perm => !Object.values(EPermissions).includes(perm as EPermissions)
      );

      if (invalidPermissions.length > 0) {
        this.logger.warn(`[${this.context}] Invalid permissions specified`, {
          invalidPermissions,
        });
        throw new ForbiddenException(`Invalid permissions: ${invalidPermissions.join(', ')}`);
      }

      // Check if user has any of the required permissions (OR logic)
      const hasPermission = await this.permissionsService.userHasAnyPermission(
        user.sub,
        requiredPermissions as EPermissions[]
      );

      if (!hasPermission) {
        this.logger.warn(`[${this.context}] User does not have required permissions`, {
          userId: user.sub,
          requiredPermissions,
        });
        throw new ForbiddenException('User does not have required permissions');
      }

      this.logger.debug(`[${this.context}] User has required permissions`, {
        userId: user.sub,
        requiredPermissions,
      });

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`[${this.context}] Error checking permissions`, { error: error.message });
      throw new InternalServerErrorException('Error checking permissions');
    }
  }
}