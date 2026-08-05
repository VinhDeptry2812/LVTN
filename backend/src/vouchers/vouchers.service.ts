import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, EntityManager, In } from 'typeorm';
import { Voucher, DiscountType, VoucherApplyType } from './voucher.entity';
import { Order, OrderStatus } from '../orders/order.entity';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    if (
      new Date(createVoucherDto.end_date) <=
      new Date(createVoucherDto.start_date)
    ) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu.');
    }

    const code = createVoucherDto.code.trim().toUpperCase();
    const existing = await this.voucherRepository.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException('Mã voucher này đã tồn tại.');
    }

    const { category_ids, product_ids, ...rest } = createVoucherDto;

    let categories: Category[] = [];
    if (rest.apply_type === VoucherApplyType.CATEGORY && category_ids?.length) {
      categories = await this.categoryRepository.findBy({ id: In(category_ids) });
    }

    let products: Product[] = [];
    if (rest.apply_type === VoucherApplyType.PRODUCT && product_ids?.length) {
      products = await this.productRepository.findBy({ id: In(product_ids) });
    }

    const voucher = this.voucherRepository.create({
      ...rest,
      code,
      categories,
      products,
    });
    return this.voucherRepository.save(voucher);
  }

  async findAll(page?: number, limit?: number): Promise<any> {
    if (page && limit && page > 0 && limit > 0) {
      const [data, total] = await this.voucherRepository.findAndCount({
        relations: { categories: true, products: true },
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
    return this.voucherRepository.find({
      relations: { categories: true, products: true },
      order: { created_at: 'DESC' },
    });
  }

  async findActiveVouchers(userId?: number): Promise<any[]> {
    const now = new Date();
    const vouchers = await this.voucherRepository.find({
      where: { is_active: true, is_public: true },
      relations: { categories: true, products: true },
      order: { created_at: 'DESC' },
    });

    const activeVouchers = vouchers.filter((v) => {
      const start = new Date(v.start_date);
      const end = new Date(v.end_date);
      const isNotExpired = now >= start && now <= end;
      const hasUsageLeft =
        v.usage_limit === null || v.used_count < v.usage_limit;
      return isNotExpired && hasUsageLeft;
    });

    if (!userId) {
      return activeVouchers.map((v) => ({
        ...v,
        is_used_by_user: false,
      }));
    }

    const userOrders = await this.orderRepository.find({
      where: {
        user: { id: userId },
        status: Not(OrderStatus.CANCELLED),
      },
      select: { voucher_code: true },
    });

    const codeUsageMap = new Map<string, number>();
    for (const o of userOrders) {
      if (o.voucher_code) {
        codeUsageMap.set(
          o.voucher_code,
          (codeUsageMap.get(o.voucher_code) || 0) + 1,
        );
      }
    }

    return activeVouchers.map((v) => {
      const userUsedCount = codeUsageMap.get(v.code) || 0;
      const perUserLimit = v.usage_limit_per_user || 1;
      return {
        ...v,
        is_used_by_user: userUsedCount >= perUserLimit,
      };
    });
  }

  async findOne(id: number): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({
      where: { id },
      relations: { categories: true, products: true },
    });
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy mã giảm giá.');
    }
    return voucher;
  }

  async update(
    id: number,
    updateVoucherDto: UpdateVoucherDto,
  ): Promise<Voucher> {
    const voucher = await this.findOne(id);

    const startDate = updateVoucherDto.start_date
      ? new Date(updateVoucherDto.start_date)
      : voucher.start_date;
    const endDate = updateVoucherDto.end_date
      ? new Date(updateVoucherDto.end_date)
      : voucher.end_date;
    if (new Date(endDate) <= new Date(startDate)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu.');
    }

    if (updateVoucherDto.code) {
      const code = updateVoucherDto.code.trim().toUpperCase();
      if (code !== voucher.code) {
        const existing = await this.voucherRepository.findOne({
          where: { code },
        });
        if (existing) {
          throw new BadRequestException('Mã voucher này đã tồn tại.');
        }
        updateVoucherDto.code = code;
      }
    }

    const { category_ids, product_ids, ...rest } = updateVoucherDto;

    const applyType = rest.apply_type || voucher.apply_type;
    if (applyType === VoucherApplyType.CATEGORY) {
      if (category_ids !== undefined) {
        voucher.categories = category_ids.length
          ? await this.categoryRepository.findBy({ id: In(category_ids) })
          : [];
      }
      voucher.products = [];
    } else if (applyType === VoucherApplyType.PRODUCT) {
      if (product_ids !== undefined) {
        voucher.products = product_ids.length
          ? await this.productRepository.findBy({ id: In(product_ids) })
          : [];
      }
      voucher.categories = [];
    } else if (applyType === VoucherApplyType.ALL) {
      voucher.categories = [];
      voucher.products = [];
    }

    Object.assign(voucher, rest);
    return this.voucherRepository.save(voucher);
  }

  async remove(id: number): Promise<void> {
    const voucher = await this.findOne(id);
    await this.voucherRepository.remove(voucher);
  }

  async validateVoucher(
    code: string,
    orderValue: number,
    userId?: number,
    manager?: EntityManager,
    items?: Array<{ productId: number; categoryId?: number; price: number; quantity: number }>,
  ): Promise<{ voucher: Voucher; discountAmount: number }> {
    const cleanCode = code.trim().toUpperCase();
    const voucherRepo = manager
      ? manager.getRepository(Voucher)
      : this.voucherRepository;
    const orderRepo = manager
      ? manager.getRepository(Order)
      : this.orderRepository;

    const voucher = await voucherRepo.findOne({
      where: { code: cleanCode },
      relations: { categories: true, products: true },
    });

    if (!voucher) {
      throw new NotFoundException('Mã giảm giá không tồn tại.');
    }

    if (!voucher.is_active) {
      throw new BadRequestException('Mã giảm giá này đã bị vô hiệu hóa.');
    }

    const now = new Date();
    if (now < new Date(voucher.start_date)) {
      throw new BadRequestException(
        'Mã giảm giá chưa đến thời hạn bắt đầu sử dụng.',
      );
    }
    if (now > new Date(voucher.end_date)) {
      throw new BadRequestException('Mã giảm giá đã hết hạn sử dụng.');
    }

    if (
      voucher.usage_limit !== null &&
      voucher.used_count >= voucher.usage_limit
    ) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng.');
    }

    if (orderValue < Number(voucher.min_order_value)) {
      throw new BadRequestException(
        `Đơn hàng chưa đạt giá trị tối thiểu ${Number(voucher.min_order_value).toLocaleString('vi-VN')}₫ để áp dụng mã giảm giá này.`,
      );
    }

    if (userId) {
      const orderCount = await orderRepo.count({
        where: {
          user: { id: userId },
          voucher_code: voucher.code,
          status: Not(OrderStatus.CANCELLED),
        },
      });
      const perUserLimit = voucher.usage_limit_per_user || 1;
      if (orderCount >= perUserLimit) {
        throw new BadRequestException(
          `Bạn đã sử dụng hết số lần tối đa (${perUserLimit} lần) cho mã giảm giá này.`,
        );
      }
    }

    let eligibleValue = orderValue;

    if (items && items.length > 0) {
      if (voucher.apply_type === VoucherApplyType.CATEGORY) {
        const allowedCatIds = new Set((voucher.categories || []).map((c) => c.id));
        if (allowedCatIds.size > 0) {
          const prodRepo = manager ? manager.getRepository(Product) : this.productRepository;
          const productIds = items.map((i) => i.productId);
          const products = await prodRepo.find({
            where: { id: In(productIds) },
            relations: { category: true },
          });
          const prodCatMap = new Map(products.map((p) => [p.id, p.category?.id]));

          let catSubtotal = 0;
          for (const item of items) {
            const catId = item.categoryId || prodCatMap.get(item.productId);
            if (catId && allowedCatIds.has(catId)) {
              catSubtotal += item.price * item.quantity;
            }
          }

          if (catSubtotal === 0) {
            throw new BadRequestException(
              'Mã giảm giá này chỉ áp dụng cho danh mục sản phẩm nhất định và không có sản phẩm phù hợp trong giỏ hàng.',
            );
          }
          eligibleValue = catSubtotal;
        }
      } else if (voucher.apply_type === VoucherApplyType.PRODUCT) {
        const allowedProdIds = new Set((voucher.products || []).map((p) => p.id));
        if (allowedProdIds.size > 0) {
          let prodSubtotal = 0;
          for (const item of items) {
            if (allowedProdIds.has(item.productId)) {
              prodSubtotal += item.price * item.quantity;
            }
          }

          if (prodSubtotal === 0) {
            throw new BadRequestException(
              'Mã giảm giá này chỉ áp dụng cho các sản phẩm nhất định và không có sản phẩm phù hợp trong giỏ hàng.',
            );
          }
          eligibleValue = prodSubtotal;
        }
      }
    }

    let discountAmount = 0;
    if (voucher.discount_type === DiscountType.FIXED_AMOUNT) {
      discountAmount = Number(voucher.discount_value);
    } else {
      // PERCENTAGE
      discountAmount = eligibleValue * (Number(voucher.discount_value) / 100);
      if (voucher.max_discount_amount !== null) {
        const maxDiscount = Number(voucher.max_discount_amount);
        if (discountAmount > maxDiscount) {
          discountAmount = maxDiscount;
        }
      }
    }

    if (discountAmount > eligibleValue) {
      discountAmount = eligibleValue;
    }

    return { voucher, discountAmount };
  }
}
