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
import { ProfessionalProfile } from './professional-profile.entity.js';

@Entity('professional_service_areas')
@Unique(['professional_id', 'city', 'state'])
export class ProfessionalServiceArea {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('varchar', { length: 128 })
  city!: string;

  @Column('char', { length: 2 })
  state!: string;

  @Column('int', { nullable: true })
  radius_km!: number | null;

  @CreateDateColumn()
  created_at!: Date;
}
