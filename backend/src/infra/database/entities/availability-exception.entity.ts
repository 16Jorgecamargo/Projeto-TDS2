import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity.js';

@Entity('availability_exceptions')
export class AvailabilityException {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('date')
  date!: string;

  @Column('boolean')
  is_available!: boolean;

  @Column('time', { nullable: true })
  start_time!: string | null;

  @Column('time', { nullable: true })
  end_time!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  reason!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
