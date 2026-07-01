import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity('professional_profiles')
export class ProfessionalProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 36, unique: true })
  user_id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 255 })
  headline!: string;

  @Column('text', { nullable: true })
  bio!: string | null;

  @Column('int', { nullable: true })
  years_experience!: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  hourly_rate!: string | null;

  @Column('int', { nullable: true })
  service_radius_km!: number | null;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating_average!: string;

  @Column('int', { default: 0 })
  rating_count!: number;

  @Column('boolean', { default: true })
  is_available!: boolean;

  @Column('datetime', { nullable: true })
  verified_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
