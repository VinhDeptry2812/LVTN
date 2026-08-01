import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Reviews (Đánh giá sản phẩm)')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Tạo đánh giá mới cho sản phẩm (Yêu cầu đã mua hàng)',
  })
  @Post()
  create(@Request() req: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy danh sách đánh giá của người dùng hiện tại' })
  @Get('my-reviews')
  getMyReviews(@Request() req: any) {
    return this.reviewsService.getByUserId(req.user.id);
  }

  @ApiOperation({ summary: 'Lấy danh sách đánh giá 5 sao nổi bật (Public)' })
  @Get('featured')
  getFeatured() {
    return this.reviewsService.getFeaturedReviews();
  }

  @ApiOperation({ summary: 'Lấy danh sách đánh giá của sản phẩm (Public)' })
  @Get('product/:productId')
  getByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('rating') rating?: string,
    @Query('sort') sort?: string,
  ) {
    return this.reviewsService.getByProductId(
      productId,
      page ? +page : undefined,
      limit ? +limit : undefined,
      rating,
      sort,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Kiểm tra xem người dùng có thể đánh giá sản phẩm không',
  })
  @Get('can-review/:productId')
  canReview(
    @Request() req: any,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.reviewsService.canReview(req.user.id, productId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Lấy tất cả danh sách đánh giá của hệ thống (Admin & Staff)',
  })
  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reviewsService.findAll(
      page ? +page : undefined,
      limit ? +limit : undefined,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Xóa đánh giá (Admin & Staff)' })
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.delete(id);
  }
}
