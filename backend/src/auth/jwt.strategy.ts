import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super-secret-key-for-furnishop',
    });
  }

  // Hàm validate sẽ được gọi khi có Request chứa Token hợp lệ gửi lên
  async validate(payload: any) {
    // Trả về dữ liệu gán vào biến `req.user`
    return { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
  }
}
