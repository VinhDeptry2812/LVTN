import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserStatus } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

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

    // Return token directly after register
    const payload = {
      sub: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };
    return {
      message: 'Đăng ký thành công',
      access_token: await this.jwtService.signAsync(payload),
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

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return {
      message: 'Đăng nhập thành công',
      access_token: await this.jwtService.signAsync(payload),
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

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return {
      message: 'Đăng nhập Google thành công',
      access_token: await this.jwtService.signAsync(payload),
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

  async logout() {
    return {
      message: 'Đăng xuất thành công. Vui lòng xóa Token ở phía Client.',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) {
      // Để bảo mật, không trả ra lỗi nếu email không tồn tại (tránh bị dò email)
      return {
        message:
          'Nếu email hợp lệ, một mã xác nhận sẽ được gửi tới email của bạn.',
      };
    }

    // Logic gửi Email OTP ở đây (Sẽ triển khai ở Sprint sau)

    return {
      message:
        'Nếu email hợp lệ, một mã xác nhận sẽ được gửi tới email của bạn.',
    };
  }
}
