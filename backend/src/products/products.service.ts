import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Product } from './product.entity';
import { ProductDetail } from './product-detail.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';
import { InventoryTransaction } from './inventory-transaction.entity';
import { logInventoryTransaction } from './inventory-transaction.helper';
import { Promotion } from '../promotions/promotion.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderItem } from '../orders/order-item.entity';
import { OrderStatus } from '../orders/order.entity';

@Injectable()
export class ProductsService {
  private cachedPromotions: { data: Promotion[]; timestamp: number } | null = null;
  private readonly PROMO_CACHE_TTL = 60 * 1000; // 60 giây cache

  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(InventoryTransaction)
    private readonly transactionRepository: Repository<InventoryTransaction>,
    @InjectRepository(Promotion)
    private readonly promotionsRepository: Repository<Promotion>,
    private cloudinaryService: CloudinaryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async applyActivePromotions(products: Product[]): Promise<Product[]> {
    if (!products || products.length === 0) return products;

    const now = new Date().getTime();
    let activePromotions: Promotion[];

    if (
      this.cachedPromotions &&
      now - this.cachedPromotions.timestamp < this.PROMO_CACHE_TTL
    ) {
      activePromotions = this.cachedPromotions.data;
    } else {
      activePromotions = await this.promotionsRepository.find({
        where: {
          is_active: true,
        },
        relations: {
          categories: true,
          products: true,
        },
      });
      this.cachedPromotions = { data: activePromotions, timestamp: now };
    }

    const validPromotions = activePromotions.filter((p) => {
      const start = new Date(p.start_date).getTime();
      const end = new Date(p.end_date).getTime();
      return start <= now && now <= end;
    });

    products.forEach((product) => {
      const basePrice = Number(product.base_price);
      let bestDiscountPrice: number | null = null;
      let activePromoInfo: { id: number; name: string; discount_value: number; discount_type: string } | null = null;

      validPromotions.forEach((promo) => {
        let isEligible = false;

        if (promo.apply_type === 'all') {
          isEligible = true;
        } else if (promo.apply_type === 'category' && product.category?.id) {
          isEligible = promo.categories?.some((c) => Number(c.id) === Number(product.category.id)) || false;
        } else if (promo.apply_type === 'product') {
          isEligible = promo.products?.some((p) => Number(p.id) === Number(product.id)) || false;
        }

        if (isEligible) {
          let calculatedPrice = basePrice;
          const val = Number(promo.discount_value);

          if (promo.discount_type === 'percentage') {
            calculatedPrice = basePrice - (basePrice * val) / 100;
          } else if (promo.discount_type === 'fixed_amount') {
            calculatedPrice = Math.max(0, basePrice - val);
          }

          calculatedPrice = Math.round(calculatedPrice);

          if (bestDiscountPrice === null || calculatedPrice < bestDiscountPrice) {
            bestDiscountPrice = calculatedPrice;
            activePromoInfo = {
              id: promo.id,
              name: promo.name,
              discount_value: val,
              discount_type: promo.discount_type,
            };
          }
        }
      });

      if (bestDiscountPrice !== null && bestDiscountPrice < basePrice) {
        product.discount_price = bestDiscountPrice;
        (product as any).active_promotion = activePromoInfo;
      } else {
        if (!validPromotions.length && !activePromotions.length) {
          // If no promotions active at all, keep DB discount_price or null
        }
      }
    });

    return products;
  }

  async findAll(queryParams?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    onlySale?: boolean;
    sortBy?: string;
    isActive?: boolean;
  }): Promise<Product[] | { data: Product[]; total: number; page: number; totalPages: number }> {
    const { page, limit, search, category, minPrice, maxPrice, onlySale, sortBy, isActive } = queryParams || {};

    try {
      const query = this.productsRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoin('category.parent', 'parentCategory')
        .leftJoinAndSelect('product.detail', 'detail')
        .leftJoinAndSelect('product.variants', 'variants')
        .leftJoinAndSelect('product.images', 'images')
        .leftJoinAndSelect('product.collections', 'collections')
        .leftJoinAndSelect('product.reviews', 'reviews');

      if (isActive !== undefined) {
        query.andWhere('product.is_active = :isActive', { isActive });
      }

    // 1. Tìm kiếm sản phẩm thông minh (Khớp Tên, SKU, Mô tả, Danh mục & Thuộc tính)
    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      const words = cleanSearch.split(/\s+/).filter(Boolean);

      words.forEach((w, idx) => {
        const paramName = `searchWord_${idx}`;
        query.andWhere(
          `(product.name ILIKE :${paramName}
            OR product.sku ILIKE :${paramName}
            OR product.description ILIKE :${paramName}
            OR category.name ILIKE :${paramName}
            OR variants.sku ILIKE :${paramName}
            OR CAST(detail.specifications AS text) ILIKE :${paramName}
            OR CAST(variants.attributes AS text) ILIKE :${paramName})`,
          { [paramName]: `%${w}%` },
        );
      });
    }

    // 2. Lọc theo category slug (bao gồm cả sản phẩm thuộc danh mục cha và các danh mục con trực thuộc)
    if (category) {
      const categorySlugs = category.split(',').map((s) => s.trim()).filter(Boolean);
      if (categorySlugs.length > 0) {
        query.andWhere(
          '(category.slug IN (:...categorySlugs) OR parentCategory.slug IN (:...categorySlugs))',
          { categorySlugs },
        );
      }
    }

    // 3. Lọc theo khoảng giá (discount_price nếu có, không thì dùng base_price)
    if (minPrice !== undefined) {
      query.andWhere(
        'COALESCE(product.discount_price, product.base_price) >= :minPrice',
        { minPrice },
      );
    }
    if (maxPrice !== undefined) {
      query.andWhere(
        'COALESCE(product.discount_price, product.base_price) <= :maxPrice',
        { maxPrice },
      );
    }

    // 4. Sắp xếp kết quả
    if (sortBy === 'price-low') {
      query.orderBy(
        'COALESCE(product.discount_price, product.base_price)',
        'ASC',
      );
    } else if (sortBy === 'price-high') {
      query.orderBy(
        'COALESCE(product.discount_price, product.base_price)',
        'DESC',
      );
    } else if (sortBy === 'newest') {
      query.orderBy('product.created_at', 'DESC');
    } else {
      query.orderBy('product.id', 'DESC');
    }

    let totalCount: number | null = null;
    const canDbPaginate =
      page !== undefined &&
      limit !== undefined &&
      page > 0 &&
      limit > 0 &&
      !onlySale &&
      sortBy !== 'popular';

    if (canDbPaginate) {
      totalCount = await query.getCount();
      query.skip((page - 1) * limit).take(limit);
    }

    const products = await query.getMany();

    const soldCountMap = new Map<number, number>();
    const inventoryUpdateMap = new Map<number, Date>();
    const stockAdditionMap = new Map<number, Date>();

    if (products.length > 0) {
      const productIds = products.map((p) => p.id);

      // Query sold counts chỉ cho sản phẩm trên trang hiện tại
      const soldCounts = await this.productsRepository.manager
        .createQueryBuilder(OrderItem, 'oi')
        .select('oi.product_id', 'productId')
        .addSelect('SUM(oi.quantity)', 'soldQty')
        .innerJoin('oi.order', 'order')
        .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
        .andWhere('oi.product_id IN (:...productIds)', { productIds })
        .groupBy('oi.product_id')
        .getRawMany();

      soldCounts.forEach((row) => {
        soldCountMap.set(Number(row.productId), Number(row.soldQty || 0));
      });

      // Query latest inventory transaction date chỉ cho sản phẩm trên trang hiện tại
      const latestInventoryUpdates = await this.productsRepository.manager
        .createQueryBuilder(InventoryTransaction, 'it')
        .select('pv.product_id', 'productId')
        .addSelect('MAX(it.created_at)', 'latestUpdate')
        .innerJoin('it.variant', 'pv')
        .where('pv.product_id IN (:...productIds)', { productIds })
        .groupBy('pv.product_id')
        .getRawMany();

      latestInventoryUpdates.forEach((row) => {
        if (row.latestUpdate) {
          inventoryUpdateMap.set(
            Number(row.productId),
            new Date(row.latestUpdate),
          );
        }
      });

      // Query latest stock addition date chỉ cho sản phẩm trên trang hiện tại
      const latestStockAdditions = await this.productsRepository.manager
        .createQueryBuilder(InventoryTransaction, 'it')
        .select('pv.product_id', 'productId')
        .addSelect('MAX(it.created_at)', 'latestAddition')
        .innerJoin('it.variant', 'pv')
        .where('it.change_qty > 0 AND it.type = :type', {
          type: 'purchase_order',
        })
        .andWhere('pv.product_id IN (:...productIds)', { productIds })
        .groupBy('pv.product_id')
        .getRawMany();

      latestStockAdditions.forEach((row) => {
        if (row.latestAddition) {
          stockAdditionMap.set(
            Number(row.productId),
            new Date(row.latestAddition),
          );
        }
      });
    }

    products.forEach((product) => {
      const totalReviews = product.reviews?.length || 0;
      product.averageRating =
        totalReviews > 0
          ? Number(
              (
                product.reviews.reduce((sum, r) => sum + r.rating, 0) /
                totalReviews
              ).toFixed(1),
            )
          : 0;

      product.soldCount = soldCountMap.get(product.id) || 0;
      product.inventoryUpdatedAt = inventoryUpdateMap.get(product.id) || product.created_at;
      product.lastStockAddedAt = stockAdditionMap.get(product.id) || product.created_at;
    });

    let filteredList = await this.applyActivePromotions(products);

    // 5. Lọc chỉ lấy sản phẩm đang giảm giá
    if (onlySale) {
      filteredList = filteredList.filter((p) => {
        const base = Number(p.base_price || 0);
        const disc = p.discount_price ? Number(p.discount_price) : null;
        return disc !== null && disc > 0 && disc < base;
      });
    }

    // 6. Sắp xếp lại dựa trên thuộc tính đã được tính toán chính xác
    if (sortBy === 'price-low') {
      filteredList.sort((a, b) => {
        const priceA = a.discount_price ? Number(a.discount_price) : Number(a.base_price);
        const priceB = b.discount_price ? Number(b.discount_price) : Number(b.base_price);
        return priceA - priceB;
      });
    } else if (sortBy === 'price-high') {
      filteredList.sort((a, b) => {
        const priceA = a.discount_price ? Number(a.discount_price) : Number(a.base_price);
        const priceB = b.discount_price ? Number(b.discount_price) : Number(b.base_price);
        return priceB - priceA;
      });
    } else if (sortBy === 'newest') {
      filteredList.sort((a, b) => {
        const dateB = b.lastStockAddedAt ? b.lastStockAddedAt.getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        const dateA = a.lastStockAddedAt ? a.lastStockAddedAt.getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        return dateB - dateA;
      });
    } else if (sortBy === 'popular') {
      filteredList.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
    }

    // 7. Tối ưu thứ tự ưu tiên hiển thị kết quả (Relevance Ranking): Đưa sản phẩm khớp Tên & Danh mục lên đầu
    if (search && search.trim() !== '' && !sortBy) {
      const lowerSearch = search.trim().toLowerCase();
      filteredList.sort((a, b) => {
        const nameAHas = a.name ? (a.name.toLowerCase().includes(lowerSearch) ? 2 : 0) : 0;
        const nameBHas = b.name ? (b.name.toLowerCase().includes(lowerSearch) ? 2 : 0) : 0;

        const catAHas = a.category?.name ? (a.category.name.toLowerCase().includes(lowerSearch) ? 1 : 0) : 0;
        const catBHas = b.category?.name ? (b.category.name.toLowerCase().includes(lowerSearch) ? 1 : 0) : 0;

        const scoreA = nameAHas + catAHas;
        const scoreB = nameBHas + catBHas;

        return scoreB - scoreA;
      });
    }

    // 8. Trả về kết quả phân trang nếu có truyền page & limit
    if (page !== undefined && limit !== undefined && page > 0 && limit > 0) {
      const total = totalCount !== null ? totalCount : filteredList.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedData = canDbPaginate
        ? filteredList
        : filteredList.slice((page - 1) * limit, (page - 1) * limit + limit);

      return {
        data: paginatedData,
        total,
        page,
        totalPages,
      } as any;
    }

      return filteredList;
    } catch (err) {
      console.error('ERROR IN PRODUCTS FINDALL:', err);
      throw err;
    }
  }

  async getRelatedProducts(id: number, limit: number = 12): Promise<Product[]> {
    const product = await this.findOne(id);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
    }

    // 1. Tìm các sản phẩm cùng category và gần khoảng giá nhất, loại trừ chính nó
    const sameCategory = await this.productsRepository.find({
      where: {
        category: { id: product.category?.id },
        id: Not(id),
        is_active: true,
      },
      relations: {
        category: true,
        detail: true,
        variants: true,
        images: true,
        reviews: true,
      },
    });

    // Sắp xếp theo độ chênh lệch giá tuyệt đối với sản phẩm hiện tại
    const currentPrice = product.discount_price
      ? Number(product.discount_price)
      : Number(product.base_price);
    sameCategory.sort((a, b) => {
      const priceA = a.discount_price
        ? Number(a.discount_price)
        : Number(a.base_price);
      const priceB = b.discount_price
        ? Number(b.discount_price)
        : Number(b.base_price);
      return Math.abs(priceA - currentPrice) - Math.abs(priceB - currentPrice);
    });

    const recommended = sameCategory.slice(0, limit);

    recommended.forEach((p) => {
      const totalReviews = p.reviews?.length || 0;
      p.averageRating =
        totalReviews > 0
          ? Number(
              (
                p.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
              ).toFixed(1),
            )
          : 0;
    });

    return await this.applyActivePromotions(recommended);
  }

  async getFrequentlyBoughtTogether(id: number, limit: number = 12): Promise<Product[]> {
    const product = await this.findOne(id);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
    }

    // Tìm các sản phẩm được mua cùng nhau trong các đơn hàng đã hoàn thành hoặc đang xử lý
    const rawResults = await this.productsRepository.manager
      .createQueryBuilder(OrderItem, 'oi')
      .select('oi.product_id', 'productId')
      .addSelect('COUNT(oi.id)', 'count')
      .innerJoin('oi.order', 'order')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('inner_oi.order_id')
          .from(OrderItem, 'inner_oi')
          .where('inner_oi.product_id = :id')
          .getQuery();
        return 'oi.order_id IN ' + subQuery;
      })
      .andWhere('oi.product_id != :id')
      .groupBy('oi.product_id')
      .orderBy('count', 'DESC')
      .limit(limit)
      .setParameter('id', id)
      .getRawMany();

    const ids = rawResults.map((r) => r.productId);

    let recommendations: Product[] = [];
    if (ids.length > 0) {
      recommendations = await this.productsRepository.find({
        where: {
          id: In(ids),
          is_active: true,
        },
        relations: {
          category: true,
          detail: true,
          variants: true,
          images: true,
          reviews: true,
        },
      });
    }

    recommendations.forEach((p) => {
      const totalReviews = p.reviews?.length || 0;
      p.averageRating =
        totalReviews > 0
          ? Number(
              (
                p.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
              ).toFixed(1),
            )
          : 0;
    });

    return await this.applyActivePromotions(recommendations);
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: {
        category: true,
        detail: true,
        variants: true,
        images: true,
        collections: true,
        reviews: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
    }

    const totalReviews = product.reviews?.length || 0;
    product.averageRating =
      totalReviews > 0
        ? Number(
            (
              product.reviews.reduce((sum, r) => sum + r.rating, 0) /
              totalReviews
            ).toFixed(1),
          )
        : 0;

    // Calculate soldCount for single product
    const soldResult = await this.productsRepository.manager
      .createQueryBuilder(OrderItem, 'oi')
      .select('SUM(oi.quantity)', 'soldQty')
      .innerJoin('oi.order', 'order')
      .where('oi.product_id = :productId', { productId: id })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne();
      
    product.soldCount = Number(soldResult?.soldQty || 0);

    // Calculate latest inventory update for single product
    const latestInvResult = await this.productsRepository.manager
      .createQueryBuilder(InventoryTransaction, 'it')
      .select('MAX(it.created_at)', 'latestUpdate')
      .innerJoin('it.variant', 'pv')
      .where('pv.product_id = :productId', { productId: id })
      .getRawOne();

    product.inventoryUpdatedAt = latestInvResult?.latestUpdate ? new Date(latestInvResult.latestUpdate) : product.created_at;

    // Calculate latest stock addition for single product
    const latestAdditionResult = await this.productsRepository.manager
      .createQueryBuilder(InventoryTransaction, 'it')
      .select('MAX(it.created_at)', 'latestAddition')
      .innerJoin('it.variant', 'pv')
      .where('pv.product_id = :productId', { productId: id })
      .andWhere('it.change_qty > 0 AND it.type = :type', { type: 'purchase_order' })
      .getRawOne();

    product.lastStockAddedAt = latestAdditionResult?.latestAddition ? new Date(latestAdditionResult.latestAddition) : product.created_at;

    const [updatedProduct] = await this.applyActivePromotions([product]);
    return updatedProduct;
  }

  async getBestSellers(limit: number): Promise<Product[]> {
    const rawResults = await this.productsRepository.manager
      .createQueryBuilder(OrderItem, 'oi')
      .select('oi.product_id', 'productId')
      .addSelect('SUM(oi.quantity)', 'soldQty')
      .innerJoin('oi.order', 'order')
      .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy('oi.product_id')
      .orderBy('SUM(oi.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();

    const productIds = rawResults.map((r) => Number(r.productId));
    const soldQtyMap = new Map<number, number>();
    rawResults.forEach((r) => {
      soldQtyMap.set(Number(r.productId), Number(r.soldQty));
    });

    let products: Product[] = [];
    if (productIds.length > 0) {
      products = await this.productsRepository.find({
        where: {
          id: In(productIds),
          is_active: true,
        },
        relations: {
          category: true,
          detail: true,
          variants: true,
          images: true,
          reviews: true,
        },
      });

      // Populate soldCount, averageRating
      products.forEach((product) => {
        product.soldCount = soldQtyMap.get(product.id) || 0;
        
        const totalReviews = product.reviews?.length || 0;
        product.averageRating =
          totalReviews > 0
            ? Number(
                (
                  product.reviews.reduce((sum, r) => sum + r.rating, 0) /
                  totalReviews
                ).toFixed(1),
              )
            : 0;
      });

      // Sort according to rank in rawResults
      products.sort((a, b) => {
        return productIds.indexOf(a.id) - productIds.indexOf(b.id);
      });
    }

    return await this.applyActivePromotions(products);
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const { collection_ids, images, ...rest } = createProductDto as any;
      const product = this.productsRepository.create({
        ...rest,
        category: { id: rest.category_id },
      });

      const savedProduct = await this.productsRepository.save(product as any);

      if (images && images.length > 0) {
        savedProduct.images = images.map((img) => {
          const imageEntity = this.productsRepository.manager.create(
            ProductImage,
            {
              ...img,
              product: savedProduct,
            },
          );

          if (
            img.variant_index !== undefined &&
            savedProduct.variants?.[img.variant_index]
          ) {
            imageEntity.variant = savedProduct.variants[img.variant_index];
          } else if (img.variant_id) {
            imageEntity.variant = { id: img.variant_id } as any;
          }

          return imageEntity;
        });
        await this.productsRepository.manager.save(
          ProductImage,
          savedProduct.images,
        );
      }

      if (collection_ids && collection_ids.length > 0) {
        await this.productsRepository.manager
          .createQueryBuilder()
          .relation(Product, 'collections')
          .of(savedProduct.id)
          .add(collection_ids);
      }

      if (savedProduct.variants && savedProduct.variants.length > 0) {
        for (const variant of savedProduct.variants) {
          if (Number(variant.stock) > 0) {
            await logInventoryTransaction({
              manager: this.productsRepository.manager,
              variantId: variant.id,
              changeQty: Number(variant.stock),
              prevStock: 0,
              newStock: Number(variant.stock),
              type: 'initial_stock',
              note: 'Khởi tạo tồn kho ban đầu khi tạo sản phẩm mới',
            });
          }
        }
      }

      return savedProduct;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Tên sản phẩm hoặc slug đã tồn tại');
      }
      throw error;
    }
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);

    // Xử lý dọn dẹp ảnh bị xóa khỏi phần mô tả (description)
    if (
      updateProductDto.description !== undefined &&
      product.description !== updateProductDto.description
    ) {
      const oldDesc = product.description || '';
      const newDesc = updateProductDto.description || '';

      const imgRegex = /<img[^>]+src="([^">]+)"/g;

      const oldImages: string[] = [];
      let match;
      while ((match = imgRegex.exec(oldDesc)) !== null) {
        if (match[1].includes('cloudinary.com')) {
          oldImages.push(match[1]);
        }
      }

      const newImages: string[] = [];
      while ((match = imgRegex.exec(newDesc)) !== null) {
        if (match[1].includes('cloudinary.com')) {
          newImages.push(match[1]);
        }
      }

      const orphanedImages = oldImages.filter(
        (url) => !newImages.includes(url),
      );
      for (const url of orphanedImages) {
        await this.cloudinaryService
          .deleteImageByUrl(url)
          .catch((e) =>
            console.error('Lỗi khi xóa ảnh mô tả trên Cloudinary:', e),
          );
      }
    }

    // 1. Cập nhật detail (OneToOne)
    if (updateProductDto.detail) {
      if (product.detail) {
        Object.assign(product.detail, updateProductDto.detail);
      } else {
        product.detail = this.productsRepository.manager.create(
          ProductDetail,
          updateProductDto.detail,
        );
      }
      delete (updateProductDto as any).detail;
    }

    // 2. Cập nhật variants (OneToMany) với cơ chế Orphan Removal thủ công
    if (updateProductDto.variants !== undefined) {
      const incomingVariants = updateProductDto.variants || [];
      const existingVariants = product.variants || [];

      // Xóa các biến thể cũ không còn nằm trong danh sách gửi lên
      const incomingIds = incomingVariants.filter((v) => v.id).map((v) => v.id);
      const toDelete = existingVariants.filter(
        (ev) => !incomingIds.includes(ev.id),
      );
      if (toDelete.length > 0) {
        for (const variant of toDelete) {
          if (variant.image_url) {
            const isImageUsed = incomingVariants.some(
              (iv) => iv.image_url === variant.image_url,
            );
            if (!isImageUsed) {
              await this.cloudinaryService.deleteImageByUrl(variant.image_url);
            }
          }
        }
        await this.productsRepository.manager.remove(toDelete);
      }

      // Cập nhật biến thể cũ + tạo mới biến thể chưa có ID
      product.variants = incomingVariants.map((iv) => {
        if (iv.id) {
          const existing = existingVariants.find((ev) => ev.id === iv.id);
          return Object.assign(existing || {}, iv) as ProductVariant;
        }
        return this.productsRepository.manager.create(ProductVariant, iv);
      });
      delete (updateProductDto as any).variants;
    }

    // 3. Cập nhật images (OneToMany) - thay thế toàn bộ
    if (updateProductDto.images !== undefined) {
      const incomingImages = updateProductDto.images || [];
      const existingImages = product.images || [];

      if (existingImages.length > 0) {
        for (const existingImg of existingImages) {
          if (existingImg.image_url) {
            const isImageUsed = incomingImages.some(
              (img) => img.image_url === existingImg.image_url,
            );
            if (!isImageUsed) {
              await this.cloudinaryService.deleteImageByUrl(
                existingImg.image_url,
              );
            }
          }
        }
        await this.productsRepository.manager.remove(existingImages);
      }
      product.images = incomingImages.map((img) => {
        const imageEntity = this.productsRepository.manager.create(
          ProductImage,
          img,
        );

        if (
          img.variant_index !== undefined &&
          product.variants?.[img.variant_index]
        ) {
          imageEntity.variant = product.variants[img.variant_index];
        } else if (img.variant_id) {
          imageEntity.variant = { id: img.variant_id } as any;
        }

        return imageEntity;
      });
      delete (updateProductDto as any).images;
    }

    // 4. Cập nhật các thông tin cơ bản
    const { collection_ids, ...restDto } = updateProductDto as any;
    const updated = Object.assign(product, restDto);
    if (restDto.category_id) {
      updated.category = { id: restDto.category_id } as any;
    }

    try {
      const savedProduct = await this.productsRepository.save(updated);

      if (collection_ids !== undefined) {
        const currentCollectionIds =
          product.collections?.map((c) => c.id) || [];

        // Convert input to numbers
        const newCollectionIds = (collection_ids || []).map((id: any) =>
          Number(id),
        );

        const toAdd = newCollectionIds.filter(
          (id: number) => !currentCollectionIds.includes(id),
        );
        const toRemove = currentCollectionIds.filter(
          (id: number) => !newCollectionIds.includes(id),
        );

        const relBuilder = this.productsRepository.manager
          .createQueryBuilder()
          .relation(Product, 'collections')
          .of(savedProduct.id);

        if (toRemove.length > 0) {
          await relBuilder.remove(toRemove);
        }
        if (toAdd.length > 0) {
          await relBuilder.add(toAdd);
        }
      }

      return savedProduct;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Tên sản phẩm hoặc slug đã tồn tại');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.softRemove(product);
  }

  async getInventory(
    page = 1,
    limit = 10,
    search?: string,
    filter: 'all' | 'lowStock' | 'outOfStock' = 'all',
    lowStockThreshold = 5,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.images', 'productImages')
      .orderBy('variant.id', 'ASC');

    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR variant.sku ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (filter === 'lowStock') {
      queryBuilder.andWhere(
        'variant.stock <= :lowStockThreshold AND variant.stock > 0',
        {
          lowStockThreshold,
        },
      );
    } else if (filter === 'outOfStock') {
      queryBuilder.andWhere('variant.stock = 0');
    }

    const [variants, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = variants.map((variant) => {
      const image =
        variant.image_url || variant.product?.images?.[0]?.image_url || '';
      return {
        id: variant.id,
        sku: variant.sku,
        attributes: variant.attributes,
        stock: variant.stock,
        price_adjustment: Number(variant.price_adjustment),
        image_url: image,
        product_id: variant.product?.id,
        product_name: variant.product?.name,
        base_price: Number(variant.product?.base_price),
      };
    });

    return { data, total, page, limit };
  }

  async logTransaction(
    manager: any,
    variantId: number,
    changeQty: number,
    prevStock: number,
    newStock: number,
    type: string,
    note?: string,
    referenceId?: string,
    userId?: number,
  ): Promise<void> {
    await logInventoryTransaction({
      manager,
      variantId,
      changeQty,
      prevStock,
      newStock,
      type,
      note,
      referenceId,
      userId,
    });
  }

  async checkLowStockAlert(
    variantId: number,
    currentStock: number,
    manager?: any,
  ): Promise<void> {
    if (currentStock <= 5) {
      const repo = manager
        ? manager.getRepository(ProductVariant)
        : this.variantRepository;
      const variant = await repo.findOne({
        where: { id: variantId },
        relations: { product: true },
      });
      if (variant) {
        const skuStr = variant.sku ? ` (SKU: ${variant.sku})` : '';
        const attributesStr = variant.attributes
          ? ` [${Object.entries(variant.attributes)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')}]`
          : '';

        const isOutOfStock = currentStock <= 0;
        const title = isOutOfStock
          ? 'Cảnh báo sản phẩm HẾT HÀNG'
          : 'Cảnh báo tồn kho thấp';
        const message = isOutOfStock
          ? `Biến thể sản phẩm "${variant.product?.name}"${attributesStr}${skuStr} đã hoàn toàn HẾT HÀNG (Tồn kho: 0).`
          : `Biến thể sản phẩm "${variant.product?.name}"${attributesStr}${skuStr} sắp hết hàng. Số lượng tồn kho hiện tại: ${currentStock}.`;
        const type: 'warning' | 'error' = isOutOfStock ? 'error' : 'warning';

        await this.notificationsService.create({
          title,
          message,
          type,
          reference_link: `/admin/inventory`,
        });
      }
    }
  }

  async updateVariantStock(
    variantId: number,
    stock: number,
    userId?: number,
  ): Promise<ProductVariant> {
    return this.variantRepository.manager.transaction(async (manager) => {
      const variant = await manager.findOne(ProductVariant, {
        where: { id: variantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!variant) {
        throw new NotFoundException(
          `Không tìm thấy biến thể sản phẩm với ID ${variantId}`,
        );
      }

      const prevStock = variant.stock;
      const changeQty = stock - prevStock;
      if (changeQty === 0) {
        return variant;
      }

      variant.stock = stock;
      const savedVariant = await manager.save(variant);

      await this.logTransaction(
        manager,
        variantId,
        changeQty,
        prevStock,
        stock,
        'adjustment',
        'Điều chỉnh tồn kho thủ công từ trang quản trị',
        undefined,
        userId,
      );

      // Trigger low stock warning asynchronously if stock is low
      this.checkLowStockAlert(variantId, stock, manager).catch((err) => {
        console.error('Error triggering low stock warning:', err);
      });

      return savedVariant;
    });
  }

  async getInventoryTransactions(
    page = 1,
    limit = 10,
    variantId?: number,
    type?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('tx.user', 'user')
      .orderBy('tx.created_at', 'DESC');

    if (variantId) {
      queryBuilder.andWhere('variant.id = :variantId', { variantId });
    }

    if (type && type !== 'all') {
      queryBuilder.andWhere('tx.type = :type', { type });
    }

    if (startDate) {
      queryBuilder.andWhere('tx.created_at >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('tx.created_at <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const [transactions, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = transactions.map((tx) => ({
      id: tx.id,
      change_qty: tx.change_qty,
      previous_stock: tx.previous_stock,
      new_stock: tx.new_stock,
      type: tx.type,
      note: tx.note,
      reference_id: tx.reference_id,
      created_at: tx.created_at,
      variant: tx.variant
        ? {
            id: tx.variant.id,
            sku: tx.variant.sku,
            attributes: tx.variant.attributes,
            product_name: tx.variant.product?.name,
          }
        : null,
      user: tx.user
        ? {
            id: tx.user.id,
            name: tx.user.name,
            email: tx.user.email,
          }
        : null,
    }));

    return { data, total, page, limit };
  }
}
