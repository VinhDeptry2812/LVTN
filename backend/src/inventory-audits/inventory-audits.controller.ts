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
import { InventoryAuditsService } from './inventory-audits.service';
import { CreateInventoryAuditDto } from './dto/create-inventory-audit.dto';
import { UpdateInventoryAuditDto } from './dto/update-inventory-audit.dto';
import { InventoryAuditStatus } from './inventory-audit.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Inventory Audits (Kiểm kê kho)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Controller('inventory-audits')
export class InventoryAuditsController {
  constructor(private readonly auditsService: InventoryAuditsService) {}

  @ApiOperation({ summary: 'Tạo phiếu kiểm kê mới (Admin & Staff)' })
  @Post()
  create(@Request() req, @Body() createDto: CreateInventoryAuditDto) {
    return this.auditsService.create(createDto, req.user.id);
  }

  @ApiOperation({ summary: 'Lấy danh sách phiếu kiểm kê (Admin & Staff)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: InventoryAuditStatus })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: InventoryAuditStatus,
  ) {
    return this.auditsService.findAll(
      page ? +page : 1,
      limit ? +limit : 10,
      status,
    );
  }

  @ApiOperation({ summary: 'Lấy chi tiết phiếu kiểm kê (Admin & Staff)' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditsService.findOne(+id);
  }

  @ApiOperation({
    summary: 'Cập nhật/Hoàn thành phiếu kiểm kê (Admin & Staff)',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryAuditDto,
    @Request() req,
  ) {
    return this.auditsService.update(+id, updateDto, req.user.id);
  }
}
