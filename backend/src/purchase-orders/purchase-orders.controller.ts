import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';
import { PurchaseOrderStatus } from './purchase-order.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Purchase Orders (Đơn nhập hàng)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @ApiOperation({ summary: 'Tạo đơn nhập hàng mới (Admin & Staff)' })
  @Post()
  create(@Request() req, @Body() createPoDto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(createPoDto, req.user.id);
  }

  @ApiOperation({ summary: 'Lấy danh sách đơn nhập hàng (Admin & Staff)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PurchaseOrderStatus })
  @ApiQuery({ name: 'supplierId', required: false, type: Number })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: PurchaseOrderStatus,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.purchaseOrdersService.findAll(
      page ? +page : 1,
      limit ? +limit : 10,
      status,
      supplierId ? +supplierId : undefined,
    );
  }

  @ApiOperation({ summary: 'Lấy chi tiết đơn nhập hàng (Admin & Staff)' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(+id);
  }

  @ApiOperation({
    summary: 'Cập nhật trạng thái đơn nhập hàng (Admin & Staff)',
  })
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdatePurchaseOrderStatusDto,
    @Request() req,
  ) {
    return this.purchaseOrdersService.updateStatus(
      +id,
      updateStatusDto,
      req.user.id,
    );
  }
}
