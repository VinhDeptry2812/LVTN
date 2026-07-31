import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserStatus } from '../users/user.entity';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async getTokens(userId: number, email: string, name: string, role: string) {
    const payload = {
      sub: userId,
      email,
      name,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m', // Access Token hết hạn sau 15 phút
      }),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d', // Refresh Token hết hạn sau 7 ngày
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshToken(userId: number, refreshToken: string | null) {
    let hashedToken: string | null = null;
    if (refreshToken) {
      const salt = await bcrypt.genSalt(10);
      hashedToken = await bcrypt.hash(refreshToken, salt);
    }
    await this.usersService.updateProfile(userId, {
      current_hashed_refresh_token: hashedToken,
    });
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;
    const normalizedEmail = email.toLowerCase();

    // Check if user exists
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestException('Email đã được sử dụng!');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Save user
    const newUser = await this.usersService.create({
      email: normalizedEmail,
      password_hash,
      name,
    });

    const tokens = await this.getTokens(
      newUser.id,
      newUser.email,
      newUser.name,
      newUser.role,
    );
    await this.updateRefreshToken(newUser.id, tokens.refreshToken);

    return {
      message: 'Đăng ký thành công',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
        gender: newUser.gender,
        birthday: newUser.birthday,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase();

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị khóa hoặc tạm ngưng hoạt động',
      );
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.name,
      user.role,
    );
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Đăng nhập thành công',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        gender: user.gender,
        birthday: user.birthday,
      },
    };
  }

  async googleLogin(req) {
    if (!req.user) {
      throw new BadRequestException('Không nhận được dữ liệu từ Google');
    }

    const { email, name } = req.user;
    const normalizedEmail = email.toLowerCase();

    let user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      // Tạo user mới với mật khẩu ngẫu nhiên không thể đoán được
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(
        'google_' + Date.now() + Math.random().toString(),
        salt,
      );
      user = await this.usersService.create({
        email: normalizedEmail,
        password_hash,
        name,
      });
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị khóa hoặc tạm ngưng hoạt động',
      );
    }

    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.name,
      user.role,
    );
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Đăng nhập Google thành công',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        gender: user.gender,
        birthday: user.birthday,
      },
    };
  }

  async logout(userId: number) {
    await this.updateRefreshToken(userId, null);
    return {
      message: 'Đăng xuất thành công.',
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      const user = await this.usersService.findById(userId);

      if (!user || !user.current_hashed_refresh_token) {
        throw new UnauthorizedException('Truy cập bị từ chối');
      }

      const isMatch = await bcrypt.compare(
        refreshToken,
        user.current_hashed_refresh_token,
      );
      if (!isMatch) {
        // Phát hiện cố tình sử dụng lại Token cũ đã thu hồi
        await this.updateRefreshToken(userId, null);
        throw new UnauthorizedException('Truy cập bị từ chối');
      }

      // Chỉ tạo Access Token mới
      const newPayload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
      const accessToken = await this.jwtService.signAsync(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      });

      return {
        access_token: accessToken,
        refresh_token: refreshToken, // Trả lại chính Refresh Token đang sử dụng hợp lệ
      };
    } catch (error) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) {
      // Để tránh rò rỉ email người dùng
      return {
        message:
          'Nếu email hợp lệ, một mã xác nhận sẽ được gửi tới email của bạn.',
      };
    }

    // Tạo OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // OTP có giá trị trong 5 phút

    await this.usersService.updateProfile(user.id, {
      otp_code: otp,
      otp_expires_at: expiresAt,
    });

    // Gửi email chứa mã OTP
    await this.mailService.sendOtpEmail(user.email, otp, user.name);

    return {
      message:
        'Nếu email hợp lệ, một mã xác nhận sẽ được gửi tới email của bạn.',
    };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }

    if (!user.otp_code || user.otp_code !== otp) {
      throw new BadRequestException('Mã OTP không chính xác');
    }

    if (!user.otp_expires_at) {
      throw new BadRequestException('Mã OTP không hợp lệ');
    }

    const now = new Date();
    if (new Date(user.otp_expires_at) < now) {
      throw new BadRequestException('Mã OTP đã hết hạn');
    }

    return {
      success: true,
      message: 'Mã OTP hợp lệ.',
    };
  }

  async resetPassword(email: string, otp: string, newPasswordDto: string) {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }

    if (!user.otp_code || user.otp_code !== otp) {
      throw new BadRequestException('Mã OTP không chính xác');
    }

    if (!user.otp_expires_at) {
      throw new BadRequestException('Mã OTP không hợp lệ');
    }

    const now = new Date();
    if (new Date(user.otp_expires_at) < now) {
      throw new BadRequestException('Mã OTP đã hết hạn');
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPasswordDto, salt);

    // Lưu mật khẩu và xóa sạch OTP
    await this.usersService.updateProfile(user.id, {
      password_hash,
      otp_code: null,
      otp_expires_at: null,
    });

    return {
      message: 'Đặt lại mật khẩu thành công.',
    };
  }
}
