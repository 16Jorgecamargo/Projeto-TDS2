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

@Entity('user_blocks')
@Unique(['blocker_id', 'blocked_id'])
export class UserBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  blocker_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocker_id' })
  blocker!: User;

  @Index()
  @Column('char', { length: 36 })
  blocked_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocked_id' })
  blocked!: User;

  @CreateDateColumn()
  created_at!: Date;
}
