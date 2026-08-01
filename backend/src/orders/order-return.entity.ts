import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_returns')
export class OrderReturn {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Order, (order) => order.return_request, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'simple-array', nullable: true })
  images: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  items: number[] | null;

  @Column({ type: 'text', nullable: true })
  rejected_reason: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requested_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  handled_at: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'refund' })
  action_type: 'refund' | 'exchange';

  @Column({ type: 'boolean', default: true })
  should_restock: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  toJSON() {
    const { order, ...rest } = this;
    return rest;
  }
}
