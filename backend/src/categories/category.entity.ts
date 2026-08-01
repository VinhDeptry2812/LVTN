import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Tree,
  TreeParent,
  TreeChildren,
} from 'typeorm';
import { Product } from '../products/product.entity';

@Entity('categories')
@Tree('closure-table')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  image_url: string;

  @TreeParent()
  parent: Category | null;

  @TreeChildren()
  children: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @Column({ default: false })
  is_featured: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
