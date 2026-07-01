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
import { Quote } from './quote.entity.js';
import { User } from './user.entity.js';
import { ProfessionalProfile } from './professional-profile.entity.js';

@Entity('contracts')
export class Contract {
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
  quote_id!: string;

  @ManyToOne(() => Quote)
  @JoinColumn({ name: 'quote_id' })
  quote!: Quote;

  @Index()
  @Column('char', { length: 36 })
  client_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client!: User;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('decimal', { precision: 12, scale: 2 })
  total_amount!: string;

  @Column({ type: 'enum', enum: ['active', 'completed', 'cancelled', 'disputed'], default: 'active' })
  status!: 'active' | 'completed' | 'cancelled' | 'disputed';

  @Column('datetime', { nullable: true })
  started_at!: Date | null;

  @Column('datetime', { nullable: true })
  completed_at!: Date | null;

  @Column('datetime', { nullable: true })
  cancelled_at!: Date | null;

  @Column('char', { length: 36, nullable: true })
  cancelled_by!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'cancelled_by' })
  cancelled_by_user!: User | null;

  @Column('text', { nullable: true })
  cancellation_reason!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
