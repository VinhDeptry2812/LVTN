import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { ProductDetail } from './product-detail.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private cloudinaryService: CloudinaryService,
  ) {}
  
  async findAll(): Promise<Product[]> {
    return this.productsRepository.find({ relations: { category: true, detail: true, variants: true, images: true, collections: true } });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ 
      where: { id },
      relations: { category: true, detail: true, variants: true, images: true, collections: true }
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
    }
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const { collection_ids, images, ...rest } = createProductDto as any;
      const product = this.productsRepository.create({
        ...rest,
        category: { id: rest.category_id }
      } as any);
      
      const savedProduct = (await this.productsRepository.save(product as any)) as any;

      if (images && images.length > 0) {
        savedProduct.images = images.map((img) => {
          const imageEntity = this.productsRepository.manager.create(ProductImage, {
            ...img,
            product: savedProduct,
          });
          
          if (img.variant_index !== undefined && savedProduct.variants?.[img.variant_index]) {
            imageEntity.variant = savedProduct.variants[img.variant_index];
          } else if (img.variant_id) {
            imageEntity.variant = { id: img.variant_id } as any;
          }

          return imageEntity;
        });
        await this.productsRepository.manager.save(ProductImage, savedProduct.images);
      }
      
      if (collection_ids && collection_ids.length > 0) {
        await this.productsRepository.manager
          .createQueryBuilder()
          .relation(Product, 'collections')
          .of(savedProduct.id)
          .add(collection_ids);
      }
      
      return savedProduct;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Tên sản phẩm hoặc slug đã tồn tại');
      }
      throw error;
    }
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    // Xử lý dọn dẹp ảnh bị xóa khỏi phần mô tả (description)
    if (updateProductDto.description !== undefined && product.description !== updateProductDto.description) {
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
      
      const orphanedImages = oldImages.filter(url => !newImages.includes(url));
      for (const url of orphanedImages) {
        await this.cloudinaryService.deleteImageByUrl(url).catch(e => console.error('Lỗi khi xóa ảnh mô tả trên Cloudinary:', e));
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
      const incomingIds = incomingVariants
        .filter((v) => v.id)
        .map((v) => v.id);
      const toDelete = existingVariants.filter(
        (ev) => !incomingIds.includes(ev.id),
      );
      if (toDelete.length > 0) {
        for (const variant of toDelete) {
          if (variant.image_url) {
            const isImageUsed = incomingVariants.some(iv => iv.image_url === variant.image_url);
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
            const isImageUsed = incomingImages.some(img => img.image_url === existingImg.image_url);
            if (!isImageUsed) {
              await this.cloudinaryService.deleteImageByUrl(existingImg.image_url);
            }
          }
        }
        await this.productsRepository.manager.remove(existingImages);
      }
      product.images = incomingImages.map((img) => {
        const imageEntity = this.productsRepository.manager.create(ProductImage, img);
        
        if (img.variant_index !== undefined && product.variants?.[img.variant_index]) {
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
      const savedProduct = (await this.productsRepository.save(updated as any)) as any;
      
      if (collection_ids !== undefined) {
        const currentCollectionIds = product.collections?.map(c => c.id) || [];
        
        // Convert input to numbers
        const newCollectionIds = (collection_ids || []).map((id: any) => Number(id));
        
        const toAdd = newCollectionIds.filter((id: number) => !currentCollectionIds.includes(id));
        const toRemove = currentCollectionIds.filter((id: number) => !newCollectionIds.includes(id));
        
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
}
