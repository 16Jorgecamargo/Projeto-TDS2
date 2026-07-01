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

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 255 })
  token_hash!: string;

  @Column('datetime')
  expires_at!: Date;

  @Column('datetime', { nullable: true })
  revoked_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
