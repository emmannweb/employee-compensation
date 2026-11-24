import { Inject, Injectable } from '@nestjs/common';
import { EMPLOYEE_REPOSITORY } from '@domain/tokens/employee.repository.token';
import { IEmployeeRepository } from '@domain/repositories/employee-repository';
import { EmployeeQueryDto } from '@shared/dtos/employee/employee-query.dto';
import { PaginatedResponseDto } from '@shared/pagination/paginated-response.dto';
import { EmployeeDtoMapper } from '@application/mappers/employee.dto-mapper';
import { GetEmployeeDto } from '@shared/dtos/employee/get-employee.dto';

@Injectable()
export class FindEmployeesUseCase {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repo: IEmployeeRepository) {}

  async execute(request: EmployeeQueryDto): Promise<PaginatedResponseDto<GetEmployeeDto>> {
    const result = await this.repo.find(request);

    return {
      ...result,
      items: result.items.map(employee => EmployeeDtoMapper.toDto(employee)),
    };
  }
}
