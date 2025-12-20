import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client"
import { BaseError, handlePrismaError, UnknowError, ValidationException } from "libs/errors";
import { ResponseStatus } from "libs/models/response/response-status.enum";
import { ResponseModel } from "libs/models/response/response.model";
import { Observable, catchError, throwError } from "rxjs";
import { StringEnums } from "src/common/constants";

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next
            .handle()
            .pipe(
                catchError(err => {
                    let appError: BaseError | ValidationException


                    if (err instanceof Prisma.PrismaClientKnownRequestError) {
                        appError = handlePrismaError(err); // <-- quan trọng: PHẢI dùng giá trị trả về
                    } else if (err instanceof BaseError) {
                        appError = err;
                    } else if (err instanceof ValidationException) {
                        appError = err
                    } else {
                        appError = new UnknowError(StringEnums.EMPTY, err?.message ?? err);
                    }



                    const payload = new ResponseModel({
                        error: {
                            key: appError['key'] ?? "internal.server.err",
                            text: appError['text'] ?? "Internal Server Error",
                            errorCode: appError['errorCode'] ?? 500,
                            detail: appError['detail'] ?? { message: "Internal Server Error", name: "Error" },
                        },
                        status: ResponseStatus.ERROR,
                    });
                   
                    if (appError instanceof BaseError) {

                        return throwError(() => new HttpException(payload, appError.getStatusCode()));
                    } else if (appError instanceof ValidationException) {
                        return throwError(() => new HttpException(payload, 400));
                    } return throwError(() => new HttpException(payload, 400))
                }),
            );
    }
}