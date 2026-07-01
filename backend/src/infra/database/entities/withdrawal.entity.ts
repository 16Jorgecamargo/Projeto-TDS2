import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity.js';

@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  wallet_id!: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'enum', enum: ['pix', 'bank_transfer'] })
  payment_method!: 'pix' | 'bank_transfer';

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Column('varchar', { length: 255 })
  destination!: string;

  @Column('datetime', { nullable: true })
  processed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
