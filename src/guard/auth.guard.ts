import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC } from 'libs/decorator/public.decorator';
import { TokenPayload } from 'libs/constants/interface';
import { tokenType } from 'src/common/enums';
import { config } from 'libs/config';
import { AppLogger } from 'libs/logger';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly context = AuthGuard.name;

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly logger: AppLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    // For public routes, try to extract user info but don't require it
    if (isPublic) {
      if (token) {
        try {
          const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
            secret: config.JWT_SECRET_ACCESS_TOKEN,
          });

          if (payload.tokenType === tokenType.AccessToken) {
            // Attach user information to the request (soft auth)
            request['user'] = {
              sub: payload.sub,
              email: payload.email,
              tokenType: payload.tokenType,
              roles: payload.roles,
            };
            // this.logger.debug(
            //   `[${this.context}] Public route with valid token, user attached`,
            //   { sub: payload.sub },
            // );
          }
        } catch {
          // Token invalid on public route - just ignore
          this.logger.debug(
            `[${this.context}] Public route with invalid/expired token, continuing without user`,
          );
        }
      } else {
        // this.logger.debug(
        //   `[${this.context}] Public route without token, continuing`,
        // );
      }
      return true;
    }

    if (!token) {
      this.logger.warn(`[${this.context}] No token found in request`);
      throw new UnauthorizedException('Access token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: config.JWT_SECRET_ACCESS_TOKEN,
      });

      // Verify that this is an access token
      if (payload.tokenType !== tokenType.AccessToken) {
        this.logger.warn(
          `[${this.context}] Invalid token type: ${payload.tokenType}`,
        );
        throw new UnauthorizedException('Invalid token type');
      }

      // Attach user information to the request
      request['user'] = {
        sub: payload.sub,
        email: payload.email,
        tokenType: payload.tokenType,
        roles: payload.roles,
      };

      // this.logger.debug(
      //   `[${this.context}] User authenticated successfully`,
      //   {
      //     sub: payload.sub,
      //     email: payload.email,
      //     roles: payload.roles,
      //   },
      // );

      return true;
    } catch (error) {
      this.logger.error(
        `[${this.context}] Token verification failed`,
        error as Error,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
