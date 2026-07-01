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
import { ServiceTag } from './service-tag.entity.js';

@Entity('professional_tags')
@Unique(['professional_id', 'tag_id'])
export class ProfessionalTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @Index()
  @Column('char', { length: 36 })
  tag_id!: string;

  @ManyToOne(() => ServiceTag)
  @JoinColumn({ name: 'tag_id' })
  tag!: ServiceTag;

  @CreateDateColumn()
  created_at!: Date;
}
