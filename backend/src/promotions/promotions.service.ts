import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Promotion, PromotionApplyType } from './promotion.entity';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService implements OnModuleInit {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async onModuleInit() {
    await this.syncPromotionPrices();
  }

  async syncPromotionPrices(): Promise<void> {
    try {
      const now = new Date().getTime();
      const activePromotions = await this.promotionRepository.find({
        where: { is_active: true },
        relations: { categories: true, products: true },
      });

      const validPromotions = activePromotions.filter((p) => {
        const start = new Date(p.start_date).getTime();
        const end = new Date(p.end_date).getTime();
        return start <= now && now <= end;
      });

      const products = await this.productRepository.find({
        relations: { category: { parent: { parent: true } } },
      });

      // Danh sách chứa các cập nhật giá cần thực hiện
      const productsToUpdate: { id: number; discount_price: number | null; name: string; base_price: any; oldPrice: number | null; newPrice: number | null }[] = [];

      for (const product of products) {
        let bestDiscountPrice: number | null = null;

        for (const p of validPromotions) {
          let isApplicable = false;

          if (p.apply_type === PromotionApplyType.ALL) {
            isApplicable = true;
          } else if (p.apply_type === PromotionApplyType.CATEGORY) {
            const promoCategoryIds = p.categories?.map((c) => c.id) || [];
            let currentCat: Category | null = product.category;

            while (currentCat) {
              if (promoCategoryIds.includes(currentCat.id)) {
                isApplicable = true;
                break;
              }
              currentCat = currentCat.parent || null;
            }
          } else if (p.apply_type === PromotionApplyType.PRODUCT) {
            const promoProductIds = p.products?.map((prod) => prod.id) || [];
            if (promoProductIds.includes(product.id)) {
              isApplicable = true;
            }
          }

          if (isApplicable) {
            const basePrice = Number(product.base_price);
            let calculatedDiscount = basePrice;

            if (p.discount_type === 'percentage') {
              calculatedDiscount =
                basePrice - (basePrice * Number(p.discount_value)) / 100;
            } else if (p.discount_type === ('fixed_amount' as any)) {
              calculatedDiscount = Math.max(
                0,
                basePrice - Number(p.discount_value),
              );
            }

            if (
              bestDiscountPrice === null ||
              calculatedDiscount < bestDiscountPrice
            ) {
              bestDiscountPrice = calculatedDiscount;
            }
          }
        }

        const currentDiscountPrice = product.discount_price
          ? Number(product.discount_price)
          : null;
        const targetDiscountPrice = bestDiscountPrice;

        if (currentDiscountPrice !== targetDiscountPrice) {
          productsToUpdate.push({
            id: product.id,
            discount_price: targetDiscountPrice,
            name: product.name,
            base_price: product.base_price,
            oldPrice: currentDiscountPrice,
            newPrice: targetDiscountPrice,
          });
        }
      }

      // Xử lý cập nhật DB theo lô (Batching) để tối ưu hiệu năng
      if (productsToUpdate.length > 0) {
        const BATCH_SIZE = 50;
        for (let i = 0; i < productsToUpdate.length; i += BATCH_SIZE) {
          const batch = productsToUpdate.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map((item) =>
              this.productRepository.update(item.id, {
                discount_price: item.discount_price,
              }),
            ),
          );
        }
      }
    } catch (err) {
      console.error('Lỗi khi đồng bộ giá khuyến mãi vào database:', err);
    }
  }

  async create(createDto: CreatePromotionDto): Promise<Promotion> {
    if (new Date(createDto.end_date) <= new Date(createDto.start_date)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu.');
    }

    const { category_ids, product_ids, ...rest } = createDto;

    let categories: Category[] = [];
    if (rest.apply_type === PromotionApplyType.CATEGORY && category_ids?.length) {
      categories = await this.categoryRepository.findBy({ id: In(category_ids) });
    }

    let products: Product[] = [];
    if (rest.apply_type === PromotionApplyType.PRODUCT && product_ids?.length) {
      products = await this.productRepository.findBy({ id: In(product_ids) });
    }

    const promotion = this.promotionRepository.create({
      ...rest,
      categories,
      products,
    });
    const saved = await this.promotionRepository.save(promotion);
    await this.syncPromotionPrices();
    return saved;
  }

  async findAll(): Promise<Promotion[]> {
    return this.promotionRepository.find({
      relations: { categories: true, products: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: { categories: true, products: true },
    });
    if (!promotion) {
      throw new NotFoundException('Không tìm thấy chương trình khuyến mãi.');
    }
    return promotion;
  }

  async update(id: number, updateDto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.findOne(id);

    const startDate = updateDto.start_date
      ? new Date(updateDto.start_date)
      : promotion.start_date;
    const endDate = updateDto.end_date
      ? new Date(updateDto.end_date)
      : promotion.end_date;
    if (new Date(endDate) <= new Date(startDate)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu.');
    }

    const { category_ids, product_ids, ...rest } = updateDto;

    const applyType = rest.apply_type || promotion.apply_type;
    let categories: Category[] = promotion.categories || [];
    let products: Product[] = promotion.products || [];

    if (applyType === PromotionApplyType.CATEGORY) {
      if (category_ids !== undefined) {
        categories = category_ids.length
          ? await this.categoryRepository.findBy({ id: In(category_ids) })
          : [];
      }
      products = [];
    } else if (applyType === PromotionApplyType.PRODUCT) {
      if (product_ids !== undefined) {
        products = product_ids.length
          ? await this.productRepository.findBy({ id: In(product_ids) })
          : [];
      }
      categories = [];
    } else if (applyType === PromotionApplyType.ALL) {
      categories = [];
      products = [];
    }

    const saved = await this.promotionRepository.save({
      ...promotion,
      ...rest,
      categories,
      products,
    });
    await this.syncPromotionPrices();
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const promotion = await this.findOne(id);
    await this.promotionRepository.remove(promotion);
    await this.syncPromotionPrices();
  }
}
