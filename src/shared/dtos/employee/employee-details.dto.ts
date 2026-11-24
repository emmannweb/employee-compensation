import { ApiProperty } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';
import { EmployeeCompensationDto } from './employee-compensation.dto';

export class EmployeeDetailsDto extends CreateEmployeeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: [EmployeeCompensationDto] })
  compensations!: EmployeeCompensationDto[];
}
