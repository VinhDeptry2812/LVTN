import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  Get,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './user.entity';
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
    const updatedUser = await this.usersService.updateProfile(
      userId,
      updateData,
    );
    if (!updatedUser) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return {
      message: 'Cập nhật thông tin thành công',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        birthday: updatedUser.birthday,
      },
    };
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công.' })
  @ApiResponse({
    status: 400,
    description:
      'Mật khẩu cũ không chính xác hoặc xác nhận mật khẩu không khớp.',
  })
  async changePassword(@Request() req, @Body() body: ChangePasswordDto) {
    // Kiểm tra mật khẩu xác nhận
    if (body.newPassword !== body.confirmNewPassword) {
      throw new BadRequestException(
        'Mật khẩu xác nhận không khớp với mật khẩu mới',
      );
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

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: Lấy danh sách toàn bộ người dùng (Có phân trang & Tìm kiếm)' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách người dùng.' })
  async getUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(page || 1, limit || 10, search);
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: Khóa/Mở khóa tài khoản' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công.' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    if (!['active', 'inactive'].includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ. Chỉ chấp nhận active hoặc inactive');
    }
    const updatedUser = await this.usersService.updateStatus(id, status);
    if (!updatedUser) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return {
      message: 'Cập nhật trạng thái tài khoản thành công',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    };
  }
}
