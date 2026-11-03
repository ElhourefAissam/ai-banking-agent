import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = (request.headers['x-correlation-id'] as string) || randomUUID();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    let message = 'An unexpected internal server error occurred';
    let errorCode: string | undefined;
    let errors: any = undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, any>;
      message = respObj.message || message;
      errorCode = respObj.code || respObj.error;
      errors = respObj.errors;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `[${correlationId}] 500 Internal Error on ${request.method} ${request.url}: ${
          exception instanceof Error ? exception.stack : JSON.stringify(exception)
        }`
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${status} ${request.method} ${request.url} - ${JSON.stringify(message)}`
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      errorCode,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    });
  }
}
