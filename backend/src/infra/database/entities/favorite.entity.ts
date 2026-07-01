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
import { User } from './user.entity.js';
import { ProfessionalProfile } from './professional-profile.entity.js';

@Entity('favorites')
@Unique(['user_id', 'professional_id'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional!: ProfessionalProfile;

  @CreateDateColumn()
  created_at!: Date;
}
