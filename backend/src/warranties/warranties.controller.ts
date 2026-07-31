import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WarrantiesService } from './warranties.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ClaimWarrantyDto, ProcessWarrantyDto } from './dto/warranty.dto';

@ApiTags('Warranties')
@Controller('warranties')
export class WarrantiesController {
  constructor(private readonly warrantiesService: WarrantiesService) {}

  @Get('lookup')
  @ApiOperation({ summary: 'Tra cứu phiếu bảo hành công khai (theo Mã phiếu, SĐT hoặc Mã đơn)' })
  @ApiResponse({ status: 200, description: 'Kết quả tra cứu phiếu bảo hành.' })
  async lookup(@Query('q') q: string) {
    return this.warrantiesService.lookup(q);
  }

  @Get('my-warranties')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách phiếu bảo hành của khách hàng đăng nhập' })
  @ApiResponse({ status: 200, description: 'Danh sách phiếu bảo hành cá nhân.' })
  async findMyWarranties(@Request() req) {
    return this.warrantiesService.findMyWarranties(req.user.id);
  }

  @Patch(':id/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khách hàng gửi yêu cầu bảo hành / sửa chữa' })
  @ApiResponse({ status: 200, description: 'Gửi yêu cầu bảo hành thành công.' })
  async claimWarranty(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ClaimWarrantyDto,
  ) {
    return this.warrantiesService.claimWarranty(id, req.user.id, dto);
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin/Staff: Lấy danh sách toàn bộ phiếu bảo hành (Có phân trang, Lọc & Tìm kiếm)' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách phiếu bảo hành.' })
  async findAllAdmin(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('claim_status') claim_status?: string,
  ) {
    return this.warrantiesService.findAllAdmin(page || 1, limit || 10, search, status, claim_status);
  }

  @Post('admin/generate-for-order/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin/Staff: Kích hoạt tạo phiếu bảo hành cho đơn hàng' })
  @ApiResponse({ status: 201, description: 'Tạo phiếu bảo hành thành công.' })
  async generateForOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.warrantiesService.generateForOrder(orderId);
  }

  @Patch('admin/:id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin/Staff: Cập nhật trạng thái xử lý bảo hành & Ghi chú kỹ thuật' })
  @ApiResponse({ status: 200, description: 'Cập nhật tiến độ bảo hành thành công.' })
  async processWarrantyAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessWarrantyDto,
  ) {
    return this.warrantiesService.processWarrantyAdmin(id, dto);
  }
}
