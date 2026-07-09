import { IsString, IsNotEmpty, MinLength, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Nguyễn Văn B',
    description: 'Họ và tên mới',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  name?: string;

  @ApiProperty({
    example: '0987654321',
    description: 'Số điện thoại',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  phone?: string;

  @ApiProperty({
    example: 'Nam',
    description: 'Giới tính (Nam/Nữ)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Giới tính phải là chuỗi ký tự' })
  gender?: string;

  @ApiProperty({
    example: '2000-01-15',
    description: 'Ngày sinh (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  birthday?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldpassword123', description: 'Mật khẩu cũ' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu cũ' })
  oldPassword: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'Mật khẩu mới (ít nhất 6 ký tự)',
  })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải từ 6 ký tự' })
  newPassword: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'Xác nhận lại mật khẩu mới',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận lại mật khẩu mới' })
  confirmNewPassword: string;
}
