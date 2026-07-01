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

@Entity('user_oauth_accounts')
@Unique(['provider', 'provider_account_id'])
export class UserOauthAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ['google', 'facebook', 'apple'] })
  provider!: 'google' | 'facebook' | 'apple';

  @Column('varchar', { length: 255 })
  provider_account_id!: string;

  @CreateDateColumn()
  created_at!: Date;
}
