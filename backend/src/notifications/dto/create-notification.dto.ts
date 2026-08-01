import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Cảnh báo hết hàng' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Biến thể SKU-123 có số lượng tồn kho còn 2.' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ example: 'warning' })
  @IsOptional()
  @IsIn(['info', 'warning', 'error', 'success'])
  type?: string;

  @ApiProperty({ example: '/admin/inventory' })
  @IsOptional()
  @IsString()
  reference_link?: string;
}
