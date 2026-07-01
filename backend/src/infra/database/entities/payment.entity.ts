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
import { Contract } from './contract.entity.js';
import { User } from './user.entity.js';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Index()
  @Column('char', { length: 36 })
  payer_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'payer_id' })
  payer!: User;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'authorized', 'captured', 'failed', 'refunded'],
    default: 'pending',
  })
  status!: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

  @Column({ type: 'enum', enum: ['wallet', 'credit_card', 'pix', 'boleto'] })
  method!: 'wallet' | 'credit_card' | 'pix' | 'boleto';

  @Column('varchar', { length: 255, nullable: true })
  external_reference!: string | null;

  @Column('datetime', { nullable: true })
  paid_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
