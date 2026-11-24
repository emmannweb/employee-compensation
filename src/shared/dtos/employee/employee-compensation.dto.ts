import { ApiProperty } from '@nestjs/swagger';
import { CompensationType } from '@domain/enums/compensation-type.enum';

export class EmployeeCompensationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CompensationType, enumName: 'CompensationType' })
  type!: CompensationType;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ format: 'date-time' })
  effectiveDate!: Date;
}
