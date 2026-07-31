import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { Review } from './review.entity';
import { Product } from '../products/product.entity';
import { Order, OrderStatus } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private formatReviewDisplayName(
    user: User | null | undefined,
    isAnonymous?: boolean,
  ): string {
    if (!user) return 'Khách hàng';

    let firstName = 'Khách hàng';
    let firstInitial = '';

    if (user.name && user.name.trim()) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length > 0) {
        const rawFirstName = parts[parts.length - 1];
        firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
        if (parts.length > 1) {
          firstInitial = parts[0][0].toUpperCase();
        }
      }
    } else if (user.email) {
      const local = user.email.split('@')[0];
      firstName = local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Khách hàng';
    }

    if (isAnonymous) {
      return 'Khách hàng';
    }

    // Nếu KHÔNG chọn ẩn danh: Chỉ lấy tên chính (ví dụ "Vinh")
    return firstName;
  }

  async create(userId: number, dto: CreateReviewDto): Promise<Review> {
    const { productId, rating, comment, images, isAnonymous } = dto;

    // 1. Kiểm tra sản phẩm tồn tại
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(
        `Không tìm thấy sản phẩm với ID ${productId}`,
      );
    }

    // 2. Kiểm tra xem người dùng đã đánh giá sản phẩm này chưa
    const existingReview = await this.reviewsRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });
    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá sản phẩm này rồi');
    }

    // 3. Kiểm tra điều kiện mua hàng (Đơn hàng thành công và chứa sản phẩm) bằng câu truy vấn EXISTS tối ưu
    const hasPurchased = await this.ordersRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .where('order.user_id = :userId', { userId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.DELIVERED, OrderStatus.COMPLETED],
      })
      .andWhere('item.product_id = :productId', { productId })
      .getExists();

    if (!hasPurchased) {
      throw new BadRequestException(
        'Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua hàng thành công',
      );
    }

    // 4. Lưu đánh giá mới
    const review = this.reviewsRepository.create({
      user: { id: userId } as User,
      product: { id: productId } as Product,
      rating,
      comment,
      images,
      is_anonymous: !!isAnonymous,
    });

    const savedReview = await this.reviewsRepository.save(review);

    // Gửi thông báo cho Admin về đánh giá mới
    this.notificationsService
      .create({
        title: 'Đánh giá sản phẩm mới',
        message: `Sản phẩm "${product.name}" vừa nhận được đánh giá ${rating}⭐ từ khách hàng.`,
        type: 'info',
        reference_link: `/admin/reviews`,
      })
      .catch((err) => {
        this.logger.error('Lỗi khi gửi thông báo đánh giá mới:', err);
      });

    return savedReview;
  }

  async getByProductId(
    productId: number,
    page?: number,
    limit?: number,
    rating?: number | string,
    sort?: string,
  ) {
    // 1. Tải tất cả đánh giá của sản phẩm để tính thống kê điểm số & tổng số ảnh
    const allReviews = await this.reviewsRepository.find({
      where: { product: { id: productId } },
      relations: { user: true },
      order: { created_at: 'DESC' },
    });

    const totalReviews = allReviews.length;
    const averageRating =
      totalReviews > 0
        ? Number(
            (
              allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            ).toFixed(1),
          )
        : 0;

    // Tổng hợp tất cả hình ảnh trải nghiệm từ khách hàng
    const allImages: string[] = [];
    allReviews.forEach((r) => {
      if (r.images && Array.isArray(r.images)) {
        allImages.push(...r.images);
      }
    });

    // 2. Lọc theo số sao nếu có
    let filtered = [...allReviews];
    if (rating && rating !== 'all') {
      const starNum = Number(rating);
      if (!isNaN(starNum)) {
        filtered = filtered.filter((r) => r.rating === starNum);
      }
    }

    // 3. Sắp xếp
    if (sort === 'newest') {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sort === 'highest') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'lowest') {
      filtered.sort((a, b) => a.rating - b.rating);
    }

    const filteredTotal = filtered.length;

    // 4. Phân trang
    let paginatedReviews = filtered;
    let pageNum = 1;
    let limitNum = filteredTotal > 0 ? filteredTotal : 6;
    let totalPages = 1;

    if (page && limit) {
      pageNum = Math.max(1, Number(page));
      limitNum = Math.max(1, Number(limit));
      totalPages = Math.ceil(filteredTotal / limitNum) || 1;
      const offset = (pageNum - 1) * limitNum;
      paginatedReviews = filtered.slice(offset, offset + limitNum);
    }

    // Định dạng tên user theo lựa chọn ẩn danh
    const formattedReviews = paginatedReviews.map((r) => {
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        images: r.images,
        is_anonymous: r.is_anonymous,
        created_at: r.created_at,
        user: {
          name: this.formatReviewDisplayName(r.user, r.is_anonymous),
        },
      };
    });

    return {
      reviews: formattedReviews,
      averageRating,
      totalReviews,
      filteredTotal,
      currentPage: pageNum,
      totalPages,
      limit: limitNum,
      allImages,
      // Thống kê phân bổ từng sao phục vụ thanh progress bar ở client
      starCounts: {
        5: allReviews.filter((r) => r.rating === 5).length,
        4: allReviews.filter((r) => r.rating === 4).length,
        3: allReviews.filter((r) => r.rating === 3).length,
        2: allReviews.filter((r) => r.rating === 2).length,
        1: allReviews.filter((r) => r.rating === 1).length,
      },
    };
  }

  async canReview(userId: number, productId: number) {
    // 1. Kiểm tra xem đã đánh giá chưa
    const existingReview = await this.reviewsRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });
    if (existingReview) {
      return { canReview: false, reason: 'Bạn đã đánh giá sản phẩm này rồi' };
    }

    // 2. Kiểm tra xem đã mua hàng thành công chưa bằng EXISTS query
    const hasPurchased = await this.ordersRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .where('order.user_id = :userId', { userId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.DELIVERED, OrderStatus.COMPLETED],
      })
      .andWhere('item.product_id = :productId', { productId })
      .getExists();

    if (!hasPurchased) {
      return {
        canReview: false,
        reason: 'Chỉ những khách hàng đã mua sản phẩm mới được đánh giá',
      };
    }

    return { canReview: true };
  }

  async findAll(page?: number, limit?: number): Promise<any> {
    if (page && limit && page > 0 && limit > 0) {
      const [data, total] = await this.reviewsRepository.findAndCount({
        relations: {
          user: true,
          product: {
            images: true,
          },
        },
        order: { created_at: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }
    return this.reviewsRepository.find({
      relations: {
        user: true,
        product: {
          images: true,
        },
      },
      order: { created_at: 'DESC' },
    });
  }

  async getByUserId(userId: number): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: { user: { id: userId } },
      relations: {
        product: {
          images: true,
        },
      },
      order: { created_at: 'DESC' },
    });
  }

  async getFeaturedReviews(limit = 10) {
    const reviews = await this.reviewsRepository.find({
      where: { rating: MoreThanOrEqual(4) },
      relations: { user: true, product: true },
      order: { rating: 'DESC', created_at: 'DESC' },
      take: limit,
    });

    return reviews.map((r) => {
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        images: r.images,
        is_anonymous: r.is_anonymous,
        created_at: r.created_at,
        user: {
          name: this.formatReviewDisplayName(r.user, r.is_anonymous),
        },
        product: r.product ? { id: r.product.id, name: r.product.name } : null,
      };
    });
  }

  async delete(reviewId: number): Promise<void> {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException(`Không tìm thấy đánh giá với ID ${reviewId}`);
    }
    await this.reviewsRepository.softRemove(review);
  }
}
