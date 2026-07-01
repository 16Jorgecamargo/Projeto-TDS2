import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ServiceDemand } from './service-demand.entity.js';
import { ProfessionalProfile } from './professional-profile.entity.js';

@Entity('demand_invitations')
@Unique(['demand_id', 'professional_id'])
export class DemandInvitation {
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

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'declined'], default: 'pending' })
  status!: 'pending' | 'accepted' | 'declined';

  @Column('datetime')
  invited_at!: Date;

  @Column('datetime', { nullable: true })
  responded_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
