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

@Entity('professional_certifications')
export class ProfessionalCertification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('varchar', { length: 255 })
  issuer!: string;

  @Column('date', { nullable: true })
  issued_at!: string | null;

  @Column('date', { nullable: true })
  expires_at!: string | null;

  @Column('varchar', { length: 512, nullable: true })
  credential_url!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
