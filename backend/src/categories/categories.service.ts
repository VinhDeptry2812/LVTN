import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Product } from '../products/product.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: TreeRepository<Category>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.findTrees();
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID ${id}`);
    }
    return category;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      const category = this.categoriesRepository.create(createCategoryDto);
      if (createCategoryDto.parentId) {
        const parent = await this.categoriesRepository.findOne({ where: { id: createCategoryDto.parentId } });
        if (!parent) {
          throw new NotFoundException(`Không tìm thấy danh mục cha với ID ${createCategoryDto.parentId}`);
        }
        category.parent = parent;
      }
      return await this.categoriesRepository.save(category);
    } catch (error) {
      if (error.code === '23505') { // Lỗi trùng lặp dữ liệu (unique constraint) trong PostgreSQL
        throw new ConflictException('Tên danh mục hoặc slug đã tồn tại');
      }
      throw error;
    }
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    
    // Nếu cập nhật ảnh mới khác ảnh cũ, xóa ảnh cũ trên Cloudinary
    if (updateCategoryDto.image_url && category.image_url && updateCategoryDto.image_url !== category.image_url) {
      await this.cloudinaryService.deleteImageByUrl(category.image_url);
    }
    
    const updated = Object.assign(category, updateCategoryDto);
    
    if (updateCategoryDto.parentId !== undefined) {
      if (updateCategoryDto.parentId === null) {
        updated.parent = null;
      } else {
        const parent = await this.categoriesRepository.findOne({ where: { id: updateCategoryDto.parentId } });
        if (!parent) {
          throw new NotFoundException(`Không tìm thấy danh mục cha với ID ${updateCategoryDto.parentId}`);
        }
        updated.parent = parent;
      }
    }

    try {
      return await this.categoriesRepository.save(updated);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Tên danh mục hoặc slug đã tồn tại');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);

    // 1. Kiểm tra danh mục con
    const childCount = await this.categoriesRepository.count({
      where: { parent: { id } },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        `Không thể xóa danh mục này vì vẫn còn ${childCount} danh mục con trực thuộc.`,
      );
    }

    // 2. Kiểm tra sản phẩm trực thuộc
    const productCount = await this.categoriesRepository.manager
      .getRepository(Product)
      .count({ where: { category: { id } } });
    if (productCount > 0) {
      throw new BadRequestException(
        `Không thể xóa danh mục này vì vẫn còn ${productCount} sản phẩm trực thuộc.`,
      );
    }

    // 3. Xóa ảnh trên Cloudinary
    if (category.image_url) {
      await this.cloudinaryService.deleteImageByUrl(category.image_url);
    }

    await this.categoriesRepository.remove(category);
  }
}
