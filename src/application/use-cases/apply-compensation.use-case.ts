import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Money } from '@domain/value-objects/money.vo';
import { IEmployeeRepository } from '@domain/repositories/employee-repository';
import { CompensationType } from '@domain/enums/compensation-type.enum';
import { EMPLOYEE_REPOSITORY } from '@domain/tokens/employee.repository.token';

@Injectable()
export class ApplyCompensationUseCase {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repo: IEmployeeRepository) {}

  async execute(employeeId: string, type: CompensationType, amount: number, currency: string): Promise<string> {
    const employee = await this.repo.findById(employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    employee.addOrUpdateCompensation(type, new Money(amount, currency), new Date());
    await this.repo.save(employee);
    return employee.getId();
  }
}
