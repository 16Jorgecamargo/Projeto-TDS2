import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 36, unique: true })
  user_id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  balance!: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  pending_balance!: string;

  @Column('char', { length: 3, default: 'BRL' })
  currency!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
