import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { User } from '../users/user.entity';

@Entity('inventory_transactions')
export class InventoryTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ type: 'int' })
  change_qty: number;

  @Column({ type: 'int' })
  previous_stock: number;

  @Column({ type: 'int' })
  new_stock: number;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'purchase_order', 'order_sale', 'order_return', 'order_cancel', 'adjustment'

  @Column({ nullable: true })
  reference_id: string; // orderId or transaction document code

  @Column({ type: 'text', nullable: true })
  note: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User; // Who performed manual adjustments

  @CreateDateColumn()
  created_at: Date;
}
