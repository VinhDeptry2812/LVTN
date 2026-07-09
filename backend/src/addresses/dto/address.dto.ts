import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Tên người nhận' })
  @IsString()
  @IsNotEmpty({ message: 'Tên người nhận không được để trống' })
  name: string;

  @ApiProperty({ example: '0912345678', description: 'SĐT người nhận' })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({
    example: 'Số 123, Đường Nguyễn Trãi, Phường 1, Quận 5, TP.HCM',
    description: 'Địa chỉ đầy đủ (tự ghép từ các dropdown)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  address: string;

  @ApiProperty({ example: '79', required: false })
  @IsOptional()
  @IsString()
  province_code?: string;

  @ApiProperty({ example: 'Thành phố Hồ Chí Minh', required: false })
  @IsOptional()
  @IsString()
  province_name?: string;

  @ApiProperty({ example: '760', required: false })
  @IsOptional()
  @IsString()
  district_code?: string;

  @ApiProperty({ example: 'Quận 5', required: false })
  @IsOptional()
  @IsString()
  district_name?: string;

  @ApiProperty({ example: '27139', required: false })
  @IsOptional()
  @IsString()
  ward_code?: string;

  @ApiProperty({ example: 'Phường 1', required: false })
  @IsOptional()
  @IsString()
  ward_name?: string;

  @ApiProperty({ example: 'Số 123, Đường Nguyễn Trãi', required: false })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

export class UpdateAddressDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  province_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  province_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ward_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ward_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
