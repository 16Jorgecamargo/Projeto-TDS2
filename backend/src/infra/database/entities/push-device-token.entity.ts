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

@Entity('push_device_tokens')
@Unique(['user_id', 'token'])
export class PushDeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 512 })
  token!: string;

  @Column({ type: 'enum', enum: ['ios', 'android', 'web'] })
  platform!: 'ios' | 'android' | 'web';

  @CreateDateColumn()
  created_at!: Date;
}
