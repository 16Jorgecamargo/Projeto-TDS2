import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PortfolioItem } from './portfolio-item.entity.js';

@Entity('portfolio_images')
export class PortfolioImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  portfolio_item_id!: string;

  @ManyToOne(() => PortfolioItem)
  @JoinColumn({ name: 'portfolio_item_id' })
  portfolio_item!: PortfolioItem;

  @Column('varchar', { length: 512 })
  image_url!: string;

  @Column('int', { default: 0 })
  position!: number;

  @CreateDateColumn()
  created_at!: Date;
}
