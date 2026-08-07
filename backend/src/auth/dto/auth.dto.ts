import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'nguyenvana@gmail.com',
    description: 'Email của người dùng',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Mật khẩu (ít nhất 6 ký tự)',
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên' })
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  name: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'nguyenvana@gmail.com',
    description: 'Email của người dùng',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'Mật khẩu' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'nguyenvana@gmail.com',
    description: 'Email của tài khoản cần lấy lại mật khẩu',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: 'nguyenvana@gmail.com',
    description: 'Email của tài khoản cần xác thực',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực OTP gồm 6 chữ số',
  })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  otp: string;
}

export class ResendOtpDto {
  @ApiProperty({
    example: 'nguyenvana@gmail.com',
    description: 'Email cần nhận lại mã OTP xác thực',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'nguyenvana@gmail.com',
    description: 'Email của tài khoản cần đặt lại mật khẩu',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực OTP gồm 6 chữ số',
  })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  otp: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'Mật khẩu mới (ít nhất 6 ký tự)',
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự' })
  newPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh Token được cấp khi đăng nhập',
  })
  @IsString({ message: 'Refresh Token phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Refresh Token không được để trống' })
  refreshToken: string;
}
