import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { DomainConflictError, DomainValidationError } from '@domain/errors/domain.errors';

type ErrorMessage = string | string[];

interface ErrorResponseBody {
  status: 'error';
  statusCode: number;
  error: string;
  message: ErrorMessage;
  timestamp: string;
  path: string;
  requestId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(value: unknown): ErrorMessage | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return value;
  }

  return undefined;
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const statusCode = this.getStatusCode(exception);
    const requestId = typeof request.id === 'string' || typeof request.id === 'number' ? String(request.id) : undefined;
    const path = (request.originalUrl ?? request.url ?? '').split('?')[0];
    const context = {
      requestId,
      method: request.method,
      path,
      statusCode,
    };

    if (statusCode >= 500) {
      this.logger.error({ ...context, err: this.toLoggableError(exception) }, 'Unhandled request exception');
    } else {
      this.logger.warn(context, 'Request failed');
    }

    const body: ErrorResponseBody = {
      status: 'error',
      statusCode,
      error: this.getErrorName(exception, statusCode),
      message: this.getMessage(exception, statusCode),
      timestamp: new Date().toISOString(),
      path,
      ...(requestId ? { requestId } : {}),
    };

    response.status(statusCode).json(body);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof DomainConflictError) {
      return HttpStatus.CONFLICT;
    }
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (exception instanceof DomainValidationError) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorName(exception: unknown, statusCode: number): string {
    if (statusCode >= 500) {
      return STATUS_CODES[statusCode] ?? 'Internal Server Error';
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (isRecord(body) && typeof body.error === 'string') {
        return body.error;
      }
    }

    return STATUS_CODES[statusCode] ?? 'Error';
  }

  private getMessage(exception: unknown, statusCode: number): ErrorMessage {
    if (statusCode >= 500) {
      return 'Internal server error';
    }

    if (exception instanceof DomainConflictError || exception instanceof DomainValidationError) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return body;
      }
      if (isRecord(body)) {
        const message = getErrorMessage(body.message);
        if (message) {
          return message;
        }
      }
      return exception.message;
    }

    return exception instanceof Error ? exception.message : 'Request failed';
  }

  private toLoggableError(exception: unknown): Error {
    const error = exception instanceof Error ? new Error(exception.message) : new Error('Non-Error exception thrown');
    if (exception instanceof Error) {
      error.name = exception.name;
      if (exception.stack) {
        error.stack = exception.stack;
      }
    }
    return error;
  }
}
