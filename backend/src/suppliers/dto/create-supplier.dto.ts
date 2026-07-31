import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Công ty TNHH Nội thất Hòa Phát' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '02838383838' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'contact@hoaphat.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Đường số 9, KCN Biên Hòa 1, Đồng Nai' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '3600123456' })
  @IsOptional()
  @IsString()
  tax_code?: string;
}
