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
import { ServiceDemand } from './service-demand.entity.js';
import { ProfessionalProfile } from './professional-profile.entity.js';

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  demand_id!: string;

  @ManyToOne(() => ServiceDemand)
  @JoinColumn({ name: 'demand_id' })
  demand!: ServiceDemand;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('text', { nullable: true })
  message!: string | null;

  @Column('decimal', { precision: 10, scale: 2 })
  total_amount!: string;

  @Column('int', { nullable: true })
  estimated_days!: number | null;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'rejected', 'withdrawn'], default: 'pending' })
  status!: 'pending' | 'accepted' | 'rejected' | 'withdrawn';

  @Column('datetime', { nullable: true })
  valid_until!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
