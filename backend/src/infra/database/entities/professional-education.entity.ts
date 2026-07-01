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

@Entity('professional_education')
export class ProfessionalEducation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('varchar', { length: 255 })
  institution!: string;

  @Column('varchar', { length: 255 })
  degree!: string;

  @Column('varchar', { length: 255, nullable: true })
  field_of_study!: string | null;

  @Column('date', { nullable: true })
  start_date!: string | null;

  @Column('date', { nullable: true })
  end_date!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
