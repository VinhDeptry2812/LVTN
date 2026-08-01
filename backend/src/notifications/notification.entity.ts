import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', default: 'info' }) // 'info' | 'warning' | 'error' | 'success'
  type: string;

  @Column({ default: false })
  is_read: boolean;

  @Column({ nullable: true })
  reference_link: string;

  @CreateDateColumn()
  created_at: Date;
}
