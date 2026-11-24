import { Employee } from '@domain/entities/employee.entity';
import { IEmployeeRepository } from '@domain/repositories/employee-repository';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmployeeOrmEntity } from './postgres/employee.orm-entity';
import { EmployeeMapper } from './mappers/employee.mapper';
import { OutboxOrmEntity } from './postgres/outbox.orm-entity';
import { DomainConflictError } from '@domain/errors/domain.errors';
import { QueryFailedError } from 'typeorm';
import { EmployeeQueryDto } from '@shared/dtos/employee/employee-query.dto';
import { PaginatedResponseDto } from '@shared/pagination/paginated-response.dto';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUniqueEmailViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;
  if (!isRecord(driverError) || driverError.code !== '23505' || driverError.table !== 'employees') {
    return false;
  }

  return driverError.constraint === 'UQ_employees_email' || (typeof driverError.detail === 'string' && /^Key \(email\)=/.test(driverError.detail));
}

@Injectable()
export class PostgresEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Employee | null> {
    const record = await this.dataSource.getRepository(EmployeeOrmEntity).findOne({ where: { id } });
    return record ? EmployeeMapper.toDomain(record) : null;
  }

  async find(request: EmployeeQueryDto): Promise<PaginatedResponseDto<Employee>> {
    const pageNumber = request.pageNumber ?? 1;
    const pageSize = request.pageSize ?? 10;
    const [records, totalRecords] = await this.dataSource.getRepository(EmployeeOrmEntity).findAndCount({
      order: { id: 'ASC' },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: records.map(record => EmployeeMapper.toDomain(record)),
      pageNumber,
      pageSize,
      totalPages: Math.ceil(totalRecords / pageSize),
      totalRecords,
    };
  }

  async save(employee: Employee): Promise<void> {
    try {
      await this.dataSource.transaction(async manager => {
        const ormEntity = EmployeeMapper.toPersistence(employee);
        await manager.save(EmployeeOrmEntity, ormEntity);

        const events = employee.pullDomainEvents();
        for (const event of events) {
          const outbox = manager.create(OutboxOrmEntity, {
            id: crypto.randomUUID(),
            aggregateId: employee.getId(),
            eventType: event.constructor.name,
            payload: event,
            createdAt: new Date(),
          });
          await manager.save(OutboxOrmEntity, outbox);
        }
      });
    } catch (error: unknown) {
      if (isUniqueEmailViolation(error)) {
        throw new DomainConflictError('An employee with this email already exists.');
      }

      throw error;
    }
  }
}
