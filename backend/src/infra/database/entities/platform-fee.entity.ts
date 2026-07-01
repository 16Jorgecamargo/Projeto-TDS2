import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity.js';

@Entity('platform_fees')
export class PlatformFee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  payment_id!: string;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;

  @Column('decimal', { precision: 5, scale: 2 })
  percentage!: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @CreateDateColumn()
  created_at!: Date;
}
