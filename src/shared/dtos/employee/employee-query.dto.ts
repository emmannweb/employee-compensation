import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';

export class EmployeeQueryDto {
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  pageNumber?: number = 1;

  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Page size',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @IsPositive()
  @Max(100)
  @IsOptional()
  pageSize?: number = 10;
}
