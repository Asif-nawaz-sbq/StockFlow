import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  timestamp: string;
  path: string;
}

/** Postgres error codes we translate instead of leaking as a 500. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) ?? (request as any).id;

    const { status, body } = this.translate(exception);

    const payload: ErrorBody = {
      ...body,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        { err: exception, requestId, path: request.originalUrl },
        'Unhandled exception',
      );
    }

    response.status(status).json(payload);
  }

  private translate(exception: unknown): {
    status: number;
    body: Omit<ErrorBody, 'timestamp' | 'path'>;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null && 'code' in res) {
        const typed = res as {
          code: string;
          message: string;
          details?: unknown;
        };
        return {
          status,
          body: {
            code: typed.code,
            message: typed.message,
            details: typed.details,
          },
        };
      }

      // ValidationPipe puts its field errors in `message` as a string array.
      if (typeof res === 'object' && res !== null && Array.isArray((res as any).message)) {
        return {
          status,
          body: {
            code: 'VALIDATION_FAILED',
            message: 'Request validation failed',
            details: { fields: (res as any).message },
          },
        };
      }

      return {
        status,
        body: {
          code: this.statusToCode(status),
          message: typeof res === 'string' ? res : exception.message,
        },
      };
    }

    if (exception instanceof QueryFailedError) {
      const driverCode = (exception as QueryFailedError & { code?: string }).code;

      if (driverCode === PG_UNIQUE_VIOLATION) {
        return {
          status: HttpStatus.CONFLICT,
          body: {
            code: 'DUPLICATE_RESOURCE',
            message: 'A record with these values already exists',
            details: { constraint: (exception as any).constraint },
          },
        };
      }
      if (driverCode === PG_FK_VIOLATION) {
        return {
          status: HttpStatus.CONFLICT,
          body: {
            code: 'REFERENCED_RESOURCE_MISSING',
            message: 'A referenced record does not exist or is still in use',
            details: { constraint: (exception as any).constraint },
          },
        };
      }
      if (driverCode === PG_CHECK_VIOLATION) {
        return {
          status: HttpStatus.CONFLICT,
          body: {
            code: 'CONSTRAINT_VIOLATION',
            message: 'The operation would leave the record in an invalid state',
            details: { constraint: (exception as any).constraint },
          },
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side',
      },
    };
  }

  private statusToCode(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHENTICATED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_NOT_FOUND';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'REQUEST_FAILED';
    }
  }
}
