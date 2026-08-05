import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Order } from '../orders/order.entity';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { User } from '../users/user.entity';
import { WarrantyClaimLog } from './warranty-claim-log.entity';

import { WarrantyStatus, ClaimStatus } from './warranty.enum';
export { WarrantyStatus, ClaimStatus };

@Entity('warranties')
export class Warranty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serial_number: string | null;

  @Column({ name: 'order_id' })
  order_id: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'product_id' })
  product_id: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'variant_id', nullable: true })
  variant_id: number | null;

  @ManyToOne(() => ProductVariant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;

  @Column({ name: 'user_id', nullable: true })
  user_id: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'int', default: 12 })
  warranty_months: number;

  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp' })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: WarrantyStatus,
    default: WarrantyStatus.ACTIVE,
  })
  status: WarrantyStatus;

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.NONE,
  })
  claim_status: ClaimStatus;

  @Column({ type: 'text', nullable: true })
  claim_reason: string | null;

  @Column({ type: 'simple-array', nullable: true })
  claim_images: string[] | null;

  @Column({ type: 'text', nullable: true })
  resolution_note: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resolution_type: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  assigned_technician: string | null;

  @Column({ type: 'timestamp', nullable: true })
  appointment_date: Date | null;

  @OneToMany(() => WarrantyClaimLog, (log) => log.warranty)
  claim_logs: WarrantyClaimLog[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
