import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common"
import { Observable } from "rxjs"
import { map } from "rxjs/operators"

export interface Response<T> {
    statusCode: number
    message: string
    data: T
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        const http = context.switchToHttp()
        return next.handle().pipe(
            map((data) => {
                return {
                    ...data,
                    statusCode: http.getResponse().statusCode,
                    message: http.getResponse().message,
                }
            }),
        )
    }
}