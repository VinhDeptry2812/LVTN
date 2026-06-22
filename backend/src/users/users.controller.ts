import { Controller, Patch, Body, UseGuards, Request, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto, ChangePasswordDto } from './dto/users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  async updateProfile(@Request() req, @Body() updateData: UpdateProfileDto) {
    const userId = req.user.id;
    const updatedUser = await this.usersService.updateProfile(userId, updateData);
    if (!updatedUser) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return {
      message: 'Cập nhật thông tin thành công',
      user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, phone: updatedUser.phone }
    };
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công.' })
  @ApiResponse({ status: 400, description: 'Mật khẩu cũ không chính xác hoặc xác nhận mật khẩu không khớp.' })
  async changePassword(@Request() req, @Body() body: ChangePasswordDto) {
    // Kiểm tra mật khẩu xác nhận
    if (body.newPassword !== body.confirmNewPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp với mật khẩu mới');
    }

    const userId = req.user.id;
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(body.oldPassword, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    // Băm mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(body.newPassword, salt);

    // Cập nhật
    await this.usersService.updatePassword(userId, password_hash);

    return { message: 'Đổi mật khẩu thành công' };
  }
}
