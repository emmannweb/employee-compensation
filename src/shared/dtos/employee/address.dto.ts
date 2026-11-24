import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddressDto {
  @ApiProperty({ description: 'street' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ description: 'city' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ description: 'country' })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({ description: 'zipCode' })
  @IsString()
  @IsNotEmpty()
  zipCode!: string;
}
