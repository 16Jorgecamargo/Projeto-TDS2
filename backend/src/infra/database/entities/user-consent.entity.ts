import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity('user_consents')
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ['terms', 'privacy', 'marketing', 'data_processing'] })
  consent_type!: 'terms' | 'privacy' | 'marketing' | 'data_processing';

  @Column('boolean')
  granted!: boolean;

  @Column('varchar', { length: 32 })
  version!: string;

  @Column('datetime')
  granted_at!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
