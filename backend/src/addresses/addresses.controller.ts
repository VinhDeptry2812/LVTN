import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@ApiTags('Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách địa chỉ của user' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách địa chỉ' })
  async findAll(@Request() req) {
    return this.addressesService.findByUser(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm địa chỉ mới' })
  @ApiResponse({ status: 201, description: 'Tạo địa chỉ thành công' })
  async create(@Request() req, @Body() dto: CreateAddressDto) {
    const address = await this.addressesService.create(req.user.id, dto);
    return { message: 'Thêm địa chỉ thành công', address };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật địa chỉ' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    const address = await this.addressesService.update(req.user.id, id, dto);
    return { message: 'Cập nhật địa chỉ thành công', address };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa địa chỉ' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    await this.addressesService.remove(req.user.id, id);
    return { message: 'Xóa địa chỉ thành công' };
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Đặt làm địa chỉ mặc định' })
  @ApiResponse({ status: 200, description: 'Đặt mặc định thành công' })
  async setDefault(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const address = await this.addressesService.setDefault(req.user.id, id);
    return { message: 'Đặt địa chỉ mặc định thành công', address };
  }
}
