import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { Order } from '../orders/order.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'int' })
  rating: number; // Điểm đánh giá (1-5)

  @Column({ type: 'text', nullable: true })
  comment: string; // Nội dung nhận xét

  @Column({ type: 'simple-array', nullable: true })
  images: string[]; // Danh sách hình ảnh do khách hàng đính kèm

  @Column({ type: 'boolean', default: false })
  is_anonymous: boolean; // Tùy chọn ẩn danh của đánh giá

  @Column({ type: 'int', default: 0 })
  edit_count: number; // Số lần đã chỉnh sửa (tối đa 1 lần)

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

}
