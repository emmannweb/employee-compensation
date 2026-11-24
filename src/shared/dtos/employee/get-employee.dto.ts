import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsNotEmpty, IsString, Matches, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AddressDto } from './address.dto';

export class GetEmployeeDto {
  @ApiProperty({ description: 'id' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'birthDate', type: 'string', format: 'date', example: '2023-11-23' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate!: string;

  @ApiProperty({ description: 'contractDate', type: 'string', format: 'date', example: '2026-11-23' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  contractDate!: string;

  @ApiProperty({ description: 'profession' })
  @IsString()
  @IsNotEmpty()
  profession!: string;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}
