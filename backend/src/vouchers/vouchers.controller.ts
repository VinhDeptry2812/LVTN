import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Vouchers (Khuyến mãi)')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @ApiOperation({ summary: 'Kiểm tra tính hợp lệ của mã voucher' })
  @Post('validate')
  async validate(
    @Body()
    body: {
      code: string;
      orderValue: number;
      userId?: number;
      items?: Array<{ productId: number; categoryId?: number; price: number; quantity: number }>;
    },
  ) {
    const result = await this.vouchersService.validateVoucher(
      body.code,
      body.orderValue,
      body.userId,
      undefined,
      body.items,
    );
    return {
      id: result.voucher.id,
      code: result.voucher.code,
      description: result.voucher.description,
      discount_type: result.voucher.discount_type,
      discount_value: Number(result.voucher.discount_value),
      discountAmount: result.discountAmount,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Thêm mới mã voucher (Admin & Staff)' })
  @Post()
  create(@Body() createVoucherDto: CreateVoucherDto) {
    return this.vouchersService.create(createVoucherDto);
  }

  @ApiOperation({ summary: 'Lấy các mã voucher đang hoạt động (Khách hàng)' })
  @Get('active')
  findActive(@Query('userId') userId?: string) {
    return this.vouchersService.findActiveVouchers(
      userId ? +userId : undefined,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Lấy tất cả các mã voucher (Admin & Staff)' })
  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.vouchersService.findAll(
      page ? +page : undefined,
      limit ? +limit : undefined,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Lấy chi tiết mã voucher (Admin & Staff)' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(+id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Cập nhật mã voucher (Admin & Staff)' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto) {
    return this.vouchersService.update(+id, updateVoucherDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Xóa mã voucher (Admin & Staff)' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vouchersService.remove(+id);
  }
}
