import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { UserService } from '../../user/user.service';

/**
 * Interceptor to extract and attach user ID and name from JWT token
 * This interceptor should be used after AuthGuard has authenticated the user
 */
@Injectable()
export class RecipeUserInterceptor implements NestInterceptor {
  constructor(private readonly userService: UserService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check if user is authenticated (set by AuthGuard)
    if (!request['user']) {
      throw new UnauthorizedException('User not authenticated');
    }

    const tokenUser = request['user'];
    const userId = tokenUser?.sub;

    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('User ID not found in token');
    }

    // Get user information from database to get the name
    const user = await this.userService.getUserByAccount(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Attach user ID and name to request in the format expected by controller
    request['user'] = {
      ...tokenUser,
      id: userId,
      name: user.name,
    };

    return next.handle();
  }
}

