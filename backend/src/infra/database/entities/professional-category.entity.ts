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
import { ServiceCategory } from './service-category.entity.js';

@Entity('professional_categories')
@Unique(['professional_id', 'category_id'])
export class ProfessionalCategory {
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
  category_id!: string;

  @ManyToOne(() => ServiceCategory)
  @JoinColumn({ name: 'category_id' })
  category!: ServiceCategory;

  @CreateDateColumn()
  created_at!: Date;
}
