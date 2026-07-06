import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_details')
export class ProductDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Product, (product) => product.detail, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  /** Thông số kỹ thuật động dạng key-value (JSONB) */
  @Column({ type: 'jsonb', nullable: true })
  specifications: Record<string, string>;

  @DeleteDateColumn()
  deleted_at: Date;
}
