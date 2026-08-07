import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResendOtpDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { UsersService } from '../users/users.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiResponse({
    status: 201,
    description:
      'Đăng ký tạo tài khoản (yêu cầu xác thực mã OTP gửi về Email).',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc Email đã tồn tại.',
  })
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Xác thực OTP khi đăng ký tài khoản' })
  @ApiResponse({
    status: 200,
    description: 'Xác thực tài khoản thành công và trả về JWT Tokens.',
  })
  @ApiResponse({ status: 400, description: 'Sai OTP hoặc hết hạn.' })
  @HttpCode(HttpStatus.OK)
  @Post('verify-register-otp')
  verifyRegisterOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyRegisterOtp(body.email, body.otp);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Gửi lại mã OTP xác thực đăng ký' })
  @ApiResponse({ status: 200, description: 'Đã gửi lại mã OTP.' })
  @HttpCode(HttpStatus.OK)
  @Post('resend-register-otp')
  resendRegisterOtp(@Body() body: ResendOtpDto) {
    return this.authService.resendRegisterOtp(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Đăng nhập hệ thống' })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công, trả về Access Token và Refresh Token.',
  })
  @ApiResponse({ status: 401, description: 'Sai email hoặc mật khẩu.' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('google')
  @UseGuards(GoogleOauthGuard)
  @ApiOperation({ summary: 'Đăng nhập bằng Google (Chuyển hướng)' })
  async googleAuth(@Req() req) {
    // Không cần logic ở đây, Guard sẽ tự động chuyển hướng người dùng sang trang Google
  }

  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  @ApiOperation({ summary: 'Google Callback nhận dữ liệu trả về' })
  async googleAuthRedirect(@Req() req, @Res() res) {
    const data = await this.authService.googleLogin(req);
    const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const frontendUrl = rawFrontendUrl.replace(/\/+$/, '');
    return res.redirect(
      `${frontendUrl}/login?token=${data.access_token}&refresh_token=${data.refresh_token}`,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy thông tin cá nhân (Yêu cầu gửi JWT Token)' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin User hiện tại.' })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token hết hạn.',
  })
  @Get('profile')
  async getProfile(@Request() req) {
    const userId = req.user?.id || req.user?.sub;
    if (userId) {
      const dbUser = await this.usersService.findById(userId);
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          phone: dbUser.phone,
          gender: dbUser.gender,
          birthday: dbUser.birthday,
          status: dbUser.status,
        };
      }
    }
    return req.user;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Đăng xuất' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công.' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Request() req) {
    return this.authService.logout(req.user.sub);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Làm mới Access Token sử dụng Refresh Token' })
  @ApiResponse({
    status: 200,
    description: 'Làm mới thành công, trả về cặp Token mới.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh Token không hợp lệ hoặc hết hạn.',
  })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body.refreshToken);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Quên mật khẩu (Gửi Email OTP)' })
  @ApiResponse({ status: 200, description: 'Thông báo gửi Email thành công.' })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Xác thực mã OTP' })
  @ApiResponse({ status: 200, description: 'Mã OTP chính xác.' })
  @ApiResponse({ status: 400, description: 'Mã OTP không đúng hoặc hết hạn.' })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Đặt lại mật khẩu mới' })
  @ApiResponse({ status: 200, description: 'Đặt lại mật khẩu thành công.' })
  @ApiResponse({
    status: 400,
    description: 'Yêu cầu không hợp lệ hoặc sai OTP.',
  })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(
      body.email,
      body.otp,
      body.newPassword,
    );
  }
}
