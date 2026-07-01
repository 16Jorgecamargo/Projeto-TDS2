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

@Entity('professional_documents')
export class ProfessionalDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Column({ type: 'enum', enum: ['rg', 'cpf', 'cnpj', 'proof_of_address', 'certificate'] })
  type!: 'rg' | 'cpf' | 'cnpj' | 'proof_of_address' | 'certificate';

  @Column('varchar', { length: 512 })
  file_url!: string;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status!: 'pending' | 'approved' | 'rejected';

  @Column('datetime', { nullable: true })
  reviewed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
