import { ApplyCompensationUseCase } from '@application/use-cases/apply-compensation.use-case';
import { CreateEmployeeUseCase } from '@application/use-cases/create-employee.use-case';
import { FindEmployeeByIdUseCase } from '@application/use-cases/find-employee-by-id.use-case';
import { FindEmployeesUseCase } from '@application/use-cases/find-employees.use-case';
import { DomainConflictError } from '@domain/errors/domain.errors';
import { HttpExceptionFilter } from '@infrastructure/logging/http-exception.filter';
import { EmployeeController } from '@presentation/controllers/employee.controller';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { Server } from 'node:net';
import request from 'supertest';

describe('Employee HTTP API', () => {
  const employeeId = 'a06a98d5-0c66-49f8-a525-7f8ac25612f8';
  const createEmployeeUseCase = { execute: jest.fn().mockResolvedValue(employeeId) };
  const applyCompensationUseCase = { execute: jest.fn().mockResolvedValue(employeeId) };
  const findEmployeesUseCase = {
    execute: jest.fn().mockResolvedValue({ items: [], pageNumber: 1, pageSize: 10, totalPages: 0, totalRecords: 0 }),
  };
  const findEmployeeByIdUseCase = { execute: jest.fn().mockResolvedValue({}) };
  const logger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const validEmployee = {
    name: 'Test Employee',
    email: 'test.employee@example.com',
    birthDate: '1990-01-01',
    contractDate: '2020-01-01',
    profession: 'Engineer',
    address: {
      street: 'Main Street',
      city: 'Example City',
      country: 'Example Country',
      zipCode: '12345',
    },
  };

  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [
        { provide: CreateEmployeeUseCase, useValue: createEmployeeUseCase },
        { provide: ApplyCompensationUseCase, useValue: applyCompensationUseCase },
        { provide: FindEmployeesUseCase, useValue: findEmployeesUseCase },
        { provide: FindEmployeeByIdUseCase, useValue: findEmployeeByIdUseCase },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    server = app.getHttpServer() as Server;
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter(logger as unknown as PinoLogger));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an employee over HTTP', async () => {
    const response = await request(server).post('/employees').send(validEmployee).expect(201);

    expect(response.text).toContain(employeeId);
    expect(createEmployeeUseCase.execute).toHaveBeenCalledWith(expect.objectContaining(validEmployee));
  });

  it('returns a concise 400 response for invalid employee input', async () => {
    const response = await request(server)
      .post('/employees')
      .send({ ...validEmployee, birthDate: 'not-a-date' })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 400,
      error: 'Bad Request',
      path: '/employees',
    });
    expect(createEmployeeUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns 400 when the compensation amount is zero', async () => {
    await request(server).post(`/employees/${employeeId}/compensations`).send({ type: 'BASE_SALARY', amount: 0, currency: 'USD' }).expect(400);

    expect(applyCompensationUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns 409 when an employee email conflicts with an existing employee', async () => {
    createEmployeeUseCase.execute.mockRejectedValueOnce(new DomainConflictError('An employee with this email already exists.'));

    const response = await request(server).post('/employees').send(validEmployee).expect(409);

    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 409,
      error: 'Conflict',
      message: 'An employee with this email already exists.',
    });
  });

  it('returns 400 for a malformed employee UUID', async () => {
    await request(server).get('/employees/not-a-uuid').expect(400);
  });
});
