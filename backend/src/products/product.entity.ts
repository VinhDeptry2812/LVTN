import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { Collection } from '../collections/collection.entity';
import { ProductDetail } from './product-detail.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';
import { Review } from '../reviews/review.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  sku: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  base_price: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  discount_price: number | null;

  @Column({ default: true })
  is_active: boolean;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToMany(() => Collection, (collection) => collection.products)
  collections: Collection[];

  @OneToOne(() => ProductDetail, (detail) => detail.product, { cascade: true })
  detail: ProductDetail;

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];

  @OneToMany(() => ProductImage, (image) => image.product, { cascade: true })
  images: ProductImage[];

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @Column({ default: false })
  is_bulky: boolean;

  averageRating?: number;

  soldCount?: number;

  inventoryUpdatedAt?: Date;

  lastStockAddedAt?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
