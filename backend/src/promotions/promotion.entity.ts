import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';
import { DiscountType } from '../vouchers/voucher.entity';

export enum PromotionApplyType {
  ALL = 'all',
  CATEGORY = 'category',
  PRODUCT = 'product',
}

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.PERCENTAGE,
  })
  discount_type: DiscountType;

  @Column({
    type: 'enum',
    enum: PromotionApplyType,
    default: PromotionApplyType.ALL,
  })
  apply_type: PromotionApplyType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discount_value: number;

  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp' })
  end_date: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ManyToMany(() => Category, { nullable: true })
  @JoinTable({
    name: 'promotion_categories',
    joinColumn: { name: 'promotion_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories?: Category[];

  @ManyToMany(() => Product, { nullable: true })
  @JoinTable({
    name: 'promotion_products',
    joinColumn: { name: 'promotion_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'product_id', referencedColumnName: 'id' },
  })
  products?: Product[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
