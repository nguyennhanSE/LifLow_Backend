import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AppLogger } from '../../../libs/logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest();
    const { method, url, body, query, params } = request;
    const started = Date.now();

    this.logger.log(`Incoming ${method} ${url}`, {
      method,
      url,
      query,
      params,
      body,
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - started;
        this.logger.log(`Responded ${method} ${url} in ${duration}ms`, {
          statusCode: httpCtx.getResponse()?.statusCode,
          duration,
          responseSample:
            typeof data === 'object'
              ? JSON.stringify(data).substring(0, 500)
              : data,
        });
      }),
    );
  }
}

