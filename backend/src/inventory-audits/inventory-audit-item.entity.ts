import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryAudit } from './inventory-audit.entity';
import { ProductVariant } from '../products/product-variant.entity';

@Entity('inventory_audit_items')
export class InventoryAuditItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => InventoryAudit, (audit) => audit.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inventory_audit_id' })
  inventory_audit: InventoryAudit;

  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ type: 'int', default: 0 })
  system_quantity: number;

  @Column({ type: 'int', default: 0 })
  actual_quantity: number;

  @Column({ type: 'int', default: 0 })
  difference: number;
}
