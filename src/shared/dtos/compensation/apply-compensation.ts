import { CompensationType } from '@domain/enums/compensation-type.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsPositive, IsString } from 'class-validator';

export class ApplyCompDto {
  @ApiProperty({ enum: CompensationType, enumName: 'CompensationType' })
  @IsEnum(CompensationType)
  type!: CompensationType;

  @ApiProperty({ description: 'amount' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ description: 'currency' })
  @IsString()
  currency!: string;
}
