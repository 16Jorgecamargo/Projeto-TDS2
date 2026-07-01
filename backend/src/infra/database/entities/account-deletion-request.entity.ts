import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity('account_deletion_requests')
export class AccountDeletionRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('text', { nullable: true })
  reason!: string | null;

  @Column('datetime')
  requested_at!: Date;

  @Column('datetime')
  scheduled_purge_at!: Date;

  @Column({ type: 'enum', enum: ['pending', 'cancelled', 'completed'], default: 'pending' })
  status!: 'pending' | 'cancelled' | 'completed';

  @CreateDateColumn()
  created_at!: Date;
}
