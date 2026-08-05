import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Warranty } from './warranty.entity';
import { ClaimStatus } from './warranty.enum';

@Entity('warranty_claim_logs')
export class WarrantyClaimLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'warranty_id' })
  warranty_id: number;

  @ManyToOne(() => Warranty, (warranty) => warranty.claim_logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warranty_id' })
  warranty: Warranty;

  @Column({ type: 'text', nullable: true })
  claim_reason: string | null;

  @Column({ type: 'simple-array', nullable: true })
  claim_images: string[] | null;

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.CLAIMING,
  })
  claim_status: ClaimStatus;

  @Column({ type: 'text', nullable: true })
  resolution_note: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resolution_type: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  assigned_technician: string | null;

  @Column({ type: 'timestamp', nullable: true })
  appointment_date: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
