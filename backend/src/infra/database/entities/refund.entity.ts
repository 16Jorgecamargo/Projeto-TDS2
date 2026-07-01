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

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  payment_id!: string;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @Column('text', { nullable: true })
  reason!: string | null;

  @Column({ type: 'enum', enum: ['pending', 'completed', 'failed'], default: 'pending' })
  status!: 'pending' | 'completed' | 'failed';

  @Column('datetime', { nullable: true })
  processed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
