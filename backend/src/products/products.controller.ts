import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Products (Sản phẩm)')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Lấy danh sách tất cả sản phẩm (Public)' })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('onlySale') onlySale?: string,
    @Query('sortBy') sortBy?: string,
    @Query('isActive') isActive?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const min = minPrice ? parseFloat(minPrice) : undefined;
    const max = maxPrice ? parseFloat(maxPrice) : undefined;
    const isSale = onlySale === 'true';

    let isActiveBool: boolean | undefined = true;
    if (isActive === 'all') {
      isActiveBool = undefined;
    } else if (isActive === 'false') {
      isActiveBool = false;
    } else if (isActive === 'true') {
      isActiveBool = true;
    }

    return this.productsService.findAll({
      page: pageNum,
      limit: limitNum,
      search,
      category,
      minPrice: min,
      maxPrice: max,
      onlySale: isSale,
      sortBy,
      isActive: isActiveBool,
    });
  }

  @ApiOperation({ summary: 'Lấy danh sách sản phẩm bán chạy nhất (Public)' })
  @Get('best-sellers')
  getBestSellers(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 12;
    return this.productsService.getBestSellers(limitNum);
  }

  @ApiOperation({ summary: 'Lấy sản phẩm liên quan (Public)' })
  @Get(':id/related')
  getRelatedProducts(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.getRelatedProducts(id);
  }

  @ApiOperation({ summary: 'Lấy sản phẩm thường mua cùng nhau (Public)' })
  @Get(':id/frequently-bought-together')
  getFrequentlyBoughtTogether(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.getFrequentlyBoughtTogether(id);
  }

  @ApiOperation({ summary: 'Lấy chi tiết 1 sản phẩm (Public)' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Thêm mới sản phẩm (Admin & Staff)' })
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Cập nhật sản phẩm (Admin & Staff)' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Xóa sản phẩm (Admin & Staff)' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Lấy danh sách tồn kho biến thể sản phẩm (Admin/Staff)',
  })
  @Get('admin/inventory')
  async getInventory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('filter') filter?: 'all' | 'lowStock' | 'outOfStock',
    @Query('lowStockThreshold') lowStockThreshold?: number,
  ) {
    return this.productsService.getInventory(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      search,
      filter || 'all',
      lowStockThreshold ? Number(lowStockThreshold) : 5,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Lấy lịch sử biến động kho (Admin/Staff)' })
  @Get('admin/inventory/transactions')
  async getInventoryTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('variantId') variantId?: number,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.productsService.getInventoryTransactions(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      variantId ? Number(variantId) : undefined,
      type,
      startDate,
      endDate,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Cập nhật số lượng tồn kho của biến thể' })
  @Patch('admin/inventory/variants/:variantId')
  updateStock(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateStockDto,
    @GetUser('id') userId: number,
  ) {
    return this.productsService.updateVariantStock(
      variantId,
      dto.stock,
      userId,
    );
  }
}
