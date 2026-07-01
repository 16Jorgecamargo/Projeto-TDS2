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

@Entity('professional_experiences')
export class ProfessionalExperience {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('varchar', { length: 255, nullable: true })
  company!: string | null;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('date')
  start_date!: string;

  @Column('date', { nullable: true })
  end_date!: string | null;

  @Column('boolean', { default: false })
  is_current!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}
