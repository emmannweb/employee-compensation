import { Injectable, Inject } from '@nestjs/common';
import { Employee } from '@domain/entities/employee.entity';
import { Address } from '@domain/value-objects/address.vo';
import { BirthDate } from '@domain/value-objects/birth-date.vo';
import { ContractDate } from '@domain/value-objects/contract-date.vo';
import { IEmployeeRepository } from '@domain/repositories/employee-repository';
import { EMPLOYEE_REPOSITORY } from '@domain/tokens/employee.repository.token';
import { CreateEmployeeDto } from '@shared/dtos/employee/create-employee.dto';

@Injectable()
export class CreateEmployeeUseCase {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repo: IEmployeeRepository) {}

  async execute(dto: CreateEmployeeDto): Promise<string> {
    const employee = Employee.create(
      dto.name,
      dto.email,
      new BirthDate(dto.birthDate),
      new ContractDate(dto.contractDate),
      dto.profession,
      new Address(dto.address.street, dto.address.city, dto.address.country, dto.address.zipCode),
    );
    await this.repo.save(employee);
    return employee.getId();
  }
}
