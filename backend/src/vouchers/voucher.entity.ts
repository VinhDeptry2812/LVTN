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

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

export enum VoucherApplyType {
  ALL = 'all',
  CATEGORY = 'category',
  PRODUCT = 'product',
}

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.FIXED_AMOUNT,
  })
  discount_type: DiscountType;

  @Column({
    type: 'enum',
    enum: VoucherApplyType,
    default: VoucherApplyType.ALL,
  })
  apply_type: VoucherApplyType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discount_value: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  max_discount_amount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  min_order_value: number;

  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp' })
  end_date: Date;

  @Column({ type: 'int', nullable: true })
  usage_limit: number | null;

  @Column({ type: 'int', default: 1 })
  usage_limit_per_user: number;

  @Column({ type: 'int', default: 0 })
  used_count: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_public: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ManyToMany(() => Category, { nullable: true })
  @JoinTable({
    name: 'voucher_categories',
    joinColumn: { name: 'voucher_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories?: Category[];

  @ManyToMany(() => Product, { nullable: true })
  @JoinTable({
    name: 'voucher_products',
    joinColumn: { name: 'voucher_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'product_id', referencedColumnName: 'id' },
  })
  products?: Product[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
