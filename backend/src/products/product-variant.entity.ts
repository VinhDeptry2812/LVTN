import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductImage } from './product-image.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  sku: string;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  /** Thuộc tính biến thể động dạng key-value (JSONB) */
  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, string>;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  import_price: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  price_adjustment: number;

  @Column({ nullable: true })
  image_url: string;

  @OneToMany(() => ProductImage, (image) => image.variant)
  images: ProductImage[];

  @DeleteDateColumn()
  deleted_at: Date;
}
