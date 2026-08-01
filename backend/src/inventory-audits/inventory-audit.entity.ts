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
import { InventoryAuditItem } from './inventory-audit-item.entity';

export enum InventoryAuditStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('inventory_audits')
export class InventoryAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => InventoryAuditItem, (item) => item.inventory_audit, {
    cascade: true,
  })
  items: InventoryAuditItem[];

  @Column({
    type: 'varchar',
    default: InventoryAuditStatus.PENDING,
  })
  status: InventoryAuditStatus;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @Column({ nullable: true })
  completed_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
