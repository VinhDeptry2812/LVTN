import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StockIssue } from './stock-issue.entity';
import { ProductVariant } from '../products/product-variant.entity';

@Entity('stock_issue_items')
export class StockIssueItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockIssue, (issue) => issue.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stock_issue_id' })
  stock_issue: StockIssue;

  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unit_price: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
