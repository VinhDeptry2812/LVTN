import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { StockIssueItem } from './stock-issue-item.entity';

import { Order } from '../orders/order.entity';

export enum StockIssueStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum StockIssueReason {
  ORDER_SALE = 'order_sale',  // Xuất bán đơn hàng
  DAMAGED = 'damaged',        // Hàng hỏng/lỗi
  EXPIRED = 'expired',        // Hết hạn sử dụng
  SAMPLE = 'sample',          // Hàng mẫu / Trưng bày
  INTERNAL_USE = 'internal_use', // Sử dụng nội bộ
  OTHER = 'other',            // Lý do khác
}

@Entity('stock_issues')
export class StockIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  code: string;

  @Column({
    type: 'varchar',
    default: StockIssueReason.OTHER,
  })
  reason: StockIssueReason;

  @Column({ nullable: true })
  order_id: number | null;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @OneToMany(() => StockIssueItem, (item) => item.stock_issue, {
    cascade: true,
  })
  items: StockIssueItem[];

  @Column({
    type: 'varchar',
    default: StockIssueStatus.PENDING,
  })
  status: StockIssueStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_amount: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewed_by: User | null;

  @Column({ nullable: true })
  completed_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
