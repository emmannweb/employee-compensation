import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EMPLOYEE_REPOSITORY } from '@domain/tokens/employee.repository.token';
import { IEmployeeRepository } from '@domain/repositories/employee-repository';
import { EmployeeDetailsDto } from '@shared/dtos/employee/employee-details.dto';
import { EmployeeDtoMapper } from '@application/mappers/employee.dto-mapper';

@Injectable()
export class FindEmployeeByIdUseCase {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repo: IEmployeeRepository) {}

  async execute(id: string): Promise<EmployeeDetailsDto> {
    const employee = await this.repo.findById(id);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return EmployeeDtoMapper.toDetailsDto(employee);
  }
}
