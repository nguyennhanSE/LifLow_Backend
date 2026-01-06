import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'libs/decorator';
import { AppLogger } from 'libs/logger';
import { Request } from 'express';
import { TokenPayload } from 'libs/constants/interface';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly context = RolesGuard.name;

  constructor(
    private readonly reflector: Reflector,
    private readonly logger: AppLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      this.logger.debug(
        `[${this.context}] No roles required for this route`,
      );
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: TokenPayload }>();
    const user = request.user;

    if (!user || !user.sub) {
      this.logger.warn(`[${this.context}] No user found in request`);
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // Get user roles from request (attached by AuthGuard)
      const userRoles: string[] = user.roles ?? [];
      // this.logger.debug(`[${this.context}] User roles`, {
      //   userId: user.sub,
      //   userRoles,
      //   requiredRoles,
      // });

      // Check if user has any of the required roles
      const hasRequiredRole = requiredRoles.some((role) =>
        userRoles.includes(role),
      );

      if (!hasRequiredRole) {
        this.logger.warn(
          `[${this.context}] User does not have required role`,
          {
            userId: user.sub,
            userRoles,
            requiredRoles,
          },
        );
        throw new ForbiddenException('Insufficient permissions');
      }

      // this.logger.debug(`[${this.context}] User has required role`, {
      //   userId: user.sub,
      //   userRoles,
      //   requiredRoles,
      // });

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `[${this.context}] Error checking user roles`,
        error as Error,
      );
      throw new ForbiddenException('Unable to verify user permissions');
    }
  }
}
