import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Quote } from './quote.entity.js';

@Entity('quote_items')
export class QuoteItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  quote_id!: string;

  @ManyToOne(() => Quote)
  @JoinColumn({ name: 'quote_id' })
  quote!: Quote;

  @Column('varchar', { length: 255 })
  description!: string;

  @Column('int', { default: 1 })
  quantity!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unit_price!: string;

  @CreateDateColumn()
  created_at!: Date;
}
