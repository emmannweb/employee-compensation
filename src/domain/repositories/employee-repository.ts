import { Employee } from '@domain/entities/employee.entity';
import { EmployeeQueryDto } from '@shared/dtos/employee/employee-query.dto';
import { PaginatedResponseDto } from '@shared/pagination/paginated-response.dto';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  save(employee: Employee): Promise<void>;
  find(request: EmployeeQueryDto): Promise<PaginatedResponseDto<Employee>>;
}
