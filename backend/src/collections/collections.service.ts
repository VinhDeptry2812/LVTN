import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from './collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createCollectionDto: CreateCollectionDto): Promise<Collection> {
    const { product_ids, ...rest } = createCollectionDto;

    const collectionData: Partial<Collection> = { ...rest };
    if (product_ids && product_ids.length > 0) {
      // Ép kiểu (any) để tránh lỗi DeepPartial yêu cầu toàn bộ thuộc tính của Product
      collectionData.products = product_ids.map((id) => ({ id }) as any);
    }

    const collection = this.collectionRepository.create(collectionData);
    return this.collectionRepository.save(collection);
  }

  async findAllAdmin(): Promise<Collection[]> {
    return this.collectionRepository.find({
      relations: { products: true },
      order: { created_at: 'DESC' },
    });
  }

  async findAllActive(): Promise<Collection[]> {
    return this.collectionRepository.find({
      where: { is_active: true },
      order: { created_at: 'DESC' },
    });
  }

  async findBySlug(slug: string): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: { slug, is_active: true },
      relations: {
        products: {
          images: true,
        },
      },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with slug ${slug} not found`);
    }

    return collection;
  }

  async update(
    id: number,
    updateCollectionDto: UpdateCollectionDto,
  ): Promise<Collection> {
    const { product_ids, ...rest } = updateCollectionDto;

    const existingCollection = await this.collectionRepository.findOne({
      where: { id },
    });
    if (!existingCollection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }

    if (
      updateCollectionDto.cover_image &&
      existingCollection.cover_image &&
      updateCollectionDto.cover_image !== existingCollection.cover_image
    ) {
      await this.cloudinaryService.deleteImageByUrl(
        existingCollection.cover_image,
      );
    }

    const updateData: any = { id, ...rest };

    if (product_ids !== undefined) {
      updateData.products = product_ids.map((productId) => ({ id: productId }));
    }

    const collection = await this.collectionRepository.preload(updateData);

    if (!collection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }

    return this.collectionRepository.save(collection);
  }

  async remove(id: number): Promise<void> {
    const collection = await this.collectionRepository.findOne({
      where: { id },
    });
    if (!collection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }

    if (collection.cover_image) {
      await this.cloudinaryService.deleteImageByUrl(collection.cover_image);
    }

    await this.collectionRepository.remove(collection);
  }
}
