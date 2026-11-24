import { Employee } from '@domain/entities/employee.entity';
import { EmployeeDetailsDto } from '@shared/dtos/employee/employee-details.dto';
import { EmployeeCompensationDto } from '@shared/dtos/employee/employee-compensation.dto';
import { GetEmployeeDto } from '@shared/dtos/employee/get-employee.dto';

export class EmployeeDtoMapper {
  static toDto(employee: Employee): GetEmployeeDto {
    const address = employee.getAddress();

    return {
      id: employee.getId(),
      name: employee.getName(),
      email: employee.getEmail(),
      birthDate: employee.getBirthDate().value,
      contractDate: employee.getContractDate().value,
      profession: employee.getProfession(),
      address: {
        street: address.street,
        city: address.city,
        country: address.country,
        zipCode: address.zipCode,
      },
    };
  }

  static toDetailsDto(employee: Employee): EmployeeDetailsDto {
    return {
      ...this.toDto(employee),
      id: employee.getId(),
      compensations: employee.getCompensations().map(compensation => {
        const amount = compensation.getAmount();
        return {
          id: compensation.getId(),
          type: compensation.getType(),
          amount: amount.amount,
          currency: amount.currency,
          effectiveDate: compensation.getEffectiveDate(),
        } satisfies EmployeeCompensationDto;
      }),
    };
  }
}
