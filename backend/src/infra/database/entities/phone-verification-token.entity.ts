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

@Entity('phone_verification_tokens')
export class PhoneVerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 10 })
  code!: string;

  @Column('datetime')
  expires_at!: Date;

  @Column('datetime', { nullable: true })
  used_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
