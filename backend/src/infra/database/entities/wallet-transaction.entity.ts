import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity.js';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  wallet_id!: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  @Column({ type: 'enum', enum: ['credit', 'debit', 'hold', 'release'] })
  type!: 'credit' | 'debit' | 'hold' | 'release';

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @Column('decimal', { precision: 12, scale: 2 })
  balance_after!: string;

  @Column({
    type: 'enum',
    enum: ['payment', 'withdrawal', 'refund', 'fee', 'adjustment'],
    nullable: true,
  })
  reference_type!: 'payment' | 'withdrawal' | 'refund' | 'fee' | 'adjustment' | null;

  @Column('char', { length: 36, nullable: true })
  reference_id!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  description!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
