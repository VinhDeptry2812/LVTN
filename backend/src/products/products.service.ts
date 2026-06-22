import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}
  
  async findAll(): Promise<Product[]> {
    return this.productsRepository.find({ relations: { category: true } });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ 
      where: { id },
      relations: { category: true }
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
    }
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const product = this.productsRepository.create({
        ...createProductDto,
        category: { id: createProductDto.category_id }
      });
      return await this.productsRepository.save(product);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Tên sản phẩm hoặc slug đã tồn tại');
      }
      throw error;
    }
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    const updated = Object.assign(product, updateProductDto);
    if (updateProductDto.category_id) {
      updated.category = { id: updateProductDto.category_id } as any;
    }
    try {
      return await this.productsRepository.save(updated);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Tên sản phẩm hoặc slug đã tồn tại');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }
}
