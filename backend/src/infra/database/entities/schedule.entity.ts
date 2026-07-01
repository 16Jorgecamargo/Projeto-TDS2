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

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column('datetime')
  scheduled_date!: Date;

  @Column('int', { nullable: true })
  duration_minutes!: number | null;

  @Column({ type: 'enum', enum: ['scheduled', 'confirmed', 'completed', 'cancelled'], default: 'scheduled' })
  status!: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

  @Column('text', { nullable: true })
  notes!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
