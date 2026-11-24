import { ArgumentsHost, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { DomainConflictError, DomainValidationError } from '@domain/errors/domain.errors';
import { HttpExceptionFilter } from '@infrastructure/logging/http-exception.filter';

describe('HttpExceptionFilter', () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request = { path: '/employees', originalUrl: '/employees?email=private', method: 'POST', id: 'request-123' };
  const logger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const pinoLogger = logger as unknown as PinoLogger;
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  let filter: HttpExceptionFilter;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new HttpExceptionFilter(pinoLogger);
  });

  it('formats validation exceptions as a 400 JSON error response', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: ['email must be an email'],
    });

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        statusCode: 400,
        error: 'Bad Request',
        message: ['email must be an email'],
        path: '/employees',
        requestId: 'request-123',
      }),
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'request-123', method: 'POST', path: '/employees', statusCode: 400 }), 'Request failed');
  });

  it('preserves unauthorized exceptions as 401', () => {
    filter.catch(new UnauthorizedException(), host);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Unauthorized',
      }),
    );
  });

  it('maps domain validation errors to 400', () => {
    filter.catch(new DomainValidationError('Employee must be at least 18 years old.'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Employee must be at least 18 years old.',
      }),
    );
  });

  it('maps domain conflicts to 409', () => {
    filter.catch(new DomainConflictError('An employee with this email already exists.'), host);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        error: 'Conflict',
        message: 'An employee with this email already exists.',
      }),
    );
  });

  it('hides unexpected error details from the response and logs the exception', () => {
    const exception = new Error('internal database details');

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Internal server error',
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'request-123', method: 'POST', path: '/employees', statusCode: 500 }), 'Unhandled request exception');
  });
});
