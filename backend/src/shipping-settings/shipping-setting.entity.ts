import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shipping_settings')
export class ShippingSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 150000 })
  bulky_inner_fee: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 350000 })
  bulky_outer_fee: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 20000000 })
  bulky_freeship_threshold: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 30000 })
  standard_inner_fee: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 60000 })
  standard_outer_fee: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 5000000 })
  standard_freeship_threshold: number;

  @Column({ type: 'simple-array', nullable: true })
  inner_city_keywords: string[];

  @Column({ type: 'simple-array', nullable: true })
  unsupported_keywords: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
