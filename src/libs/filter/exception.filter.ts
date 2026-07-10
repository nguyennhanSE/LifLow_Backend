import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { BaseError, ValidationException } from 'libs/errors';
import { AppLogger } from 'libs/logger';
import { ResponseModel } from 'libs/models/response/response.model';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly loggerService: AppLogger,
  ) { }

  public catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse();
    const request = httpContext.getRequest();

    this.loggerService.error(`[AllExceptionsFilter]`, exception);

    // Get language from Accept-Language header
    const acceptLanguage = request.headers['accept-language'] || 'en';
    const language = acceptLanguage.split(',')[0].split('-')[0]; // Extract primary language

    const { httpStatus, errorPayload } = this.getStandardizedErrorResponse(exception, language);

    const responseModel = new ResponseModel();
    responseModel.setError(errorPayload as any);


    httpAdapter.reply(response, responseModel, httpStatus);
  }

  private getStandardizedErrorResponse(
    exception: unknown,
    language: string = 'en',
  ): { httpStatus: HttpStatus; errorPayload: object } {
    if (exception instanceof BaseError) {
      // Translate error message using i18n
      
      const originalPayload = exception.toErrorPayload() as any;
      return {
        httpStatus: exception.getStatusCode(),
        errorPayload: {
          ...originalPayload,
          message: exception.message,
        },
      };
    }

    if (exception instanceof ValidationException) {
      // Translate validation error message using i18n
      let translatedMessage: string;

      if (exception.errorCode === 'validation.general') {
        // For generic validation errors, translate the specific message
        translatedMessage = exception.message;
      } else if (exception.errorCode.startsWith('validation.')) {
        // Extract the specific validation type from errorCode (e.g., 'required' from 'validation.required')
        const validationType = exception.errorCode.replace('validation.', '');

        // Try to translate the specific validation message first
        translatedMessage = exception.message;

        // If specific translation fails, try the general validation error message
        if (!translatedMessage || translatedMessage === `validation.${validationType}`) {
          translatedMessage = exception.message;
        }
      } else {
        // For error codes that don't start with 'validation.', try direct translation
        translatedMessage = exception.message;

        // If that fails, try the general validation error
        if (!translatedMessage || translatedMessage === `errors.${exception.errorCode}`) {
          translatedMessage = exception.message;
        }
      }

      // Final fallback to the original exception message
      if (!translatedMessage || translatedMessage === 'validation.error.err') {
            translatedMessage = 'Validation error';
      }
     
      return {
        httpStatus: HttpStatus.BAD_REQUEST,
        errorPayload: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: translatedMessage,
          error: 'ValidationException',
          errorCode: exception.errorCode,
          detail: exception.detail,
        },
      };
    }


    if (exception instanceof HttpException) {
      return {
        httpStatus: exception.getStatus(),
        errorPayload: exception.getResponse() as object,
      };
    }

    if (exception instanceof Error) {
      return {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        errorPayload: {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: exception.message,
          error: exception.name,
        },
      };
    }

    return {
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      errorPayload: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected and unknown error occurred.',
        error: 'Internal Server Error',
      },
    };
  }
}

