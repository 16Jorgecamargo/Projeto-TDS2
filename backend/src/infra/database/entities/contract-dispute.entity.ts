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

@Entity('contract_disputes')
export class ContractDispute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column('char', { length: 36 })
  opened_by!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'opened_by' })
  opener!: User;

  @Column('text')
  reason!: string;

  @Column({ type: 'enum', enum: ['open', 'under_review', 'resolved', 'rejected'], default: 'open' })
  status!: 'open' | 'under_review' | 'resolved' | 'rejected';

  @Column('text', { nullable: true })
  resolution!: string | null;

  @Column('char', { length: 36, nullable: true })
  resolved_by!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver!: User | null;

  @Column('datetime', { nullable: true })
  resolved_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
