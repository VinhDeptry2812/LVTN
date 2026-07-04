import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ProductVariant, (variant) => variant.images, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ nullable: true })
  variant_id: number;

  @Column()
  image_url: string;

  @Column({ default: false })
  is_primary: boolean;

  @Column({ default: false })
  is_hover: boolean;

  @DeleteDateColumn()
  deleted_at: Date;
}
