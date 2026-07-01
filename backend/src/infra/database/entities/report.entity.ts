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

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  reporter_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter!: User;

  @Column({ type: 'enum', enum: ['user', 'demand', 'review', 'message'] })
  target_type!: 'user' | 'demand' | 'review' | 'message';

  @Column('char', { length: 36 })
  target_id!: string;

  @Column({ type: 'enum', enum: ['spam', 'abuse', 'fraud', 'inappropriate', 'other'] })
  reason!: 'spam' | 'abuse' | 'fraud' | 'inappropriate' | 'other';

  @Column('text', { nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: ['pending', 'reviewed', 'dismissed', 'actioned'], default: 'pending' })
  status!: 'pending' | 'reviewed' | 'dismissed' | 'actioned';

  @Column('char', { length: 36, nullable: true })
  reviewed_by!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer!: User | null;

  @CreateDateColumn()
  created_at!: Date;
}
