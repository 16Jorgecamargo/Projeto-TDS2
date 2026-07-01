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

@Entity('user_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 36, unique: true })
  user_id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 10, default: 'pt-BR' })
  language!: string;

  @Column('varchar', { length: 64, default: 'America/Sao_Paulo' })
  timezone!: string;

  @Column('boolean', { default: true })
  email_notifications!: boolean;

  @Column('boolean', { default: true })
  push_notifications!: boolean;

  @Column('boolean', { default: false })
  sms_notifications!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
