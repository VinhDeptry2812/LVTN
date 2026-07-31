import {
  Controller,
  Patch,
  Post,
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
import { UpdateProfileDto, ChangePasswordDto, CreateUserDto } from './dto/users.dto';

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
  @ApiOperation({
    summary:
      'Admin: Lấy danh sách toàn bộ người dùng (Có phân trang, Lọc & Tìm kiếm)',
  })
  @ApiResponse({ status: 200, description: 'Trả về danh sách người dùng.' })
  async getUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll(page || 1, limit || 10, search, role, status);
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: Khóa/Mở khóa tài khoản' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công.' })
  async updateStatus(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    if (req.user.id === id) {
      throw new BadRequestException(
        'Bạn không thể tự khóa tài khoản của chính mình',
      );
    }
    if (!['active', 'inactive'].includes(status)) {
      throw new BadRequestException(
        'Trạng thái không hợp lệ. Chỉ chấp nhận active hoặc inactive',
      );
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

  @Patch('admin/:id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: Cập nhật vai trò người dùng' })
  @ApiResponse({ status: 200, description: 'Cập nhật vai trò thành công.' })
  async updateRole(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: string,
  ) {
    if (req.user.id === id) {
      throw new BadRequestException(
        'Bạn không thể tự thay đổi vai trò của chính mình',
      );
    }
    if (!['admin', 'staff', 'customer'].includes(role)) {
      throw new BadRequestException(
        'Vai trò không hợp lệ. Chỉ chấp nhận admin, staff hoặc customer',
      );
    }
    const updatedUser = await this.usersService.updateRole(id, role);
    if (!updatedUser) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return {
      message: 'Cập nhật vai trò thành công',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    };
  }

  @Post('admin/create')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: Tạo tài khoản quản trị / nhân viên mới' })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản thành công.' })
  async createAdminUser(@Body() body: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(body.email);
    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng');
    }

    if (!['admin', 'staff'].includes(body.role)) {
      throw new BadRequestException('Chỉ cho phép tạo tài khoản với vai trò admin hoặc staff');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(body.password, salt);

    const newUser = await this.usersService.create({
      name: body.name,
      email: body.email,
      phone: body.phone || undefined,
      role: body.role as UserRole,
      password_hash,
      status: 'active' as any,
    });

    return {
      message: 'Tạo tài khoản quản trị thành công',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        status: newUser.status,
      },
    };
  }
}
