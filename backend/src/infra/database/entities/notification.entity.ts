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

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ['push', 'in_app', 'email'] })
  channel!: 'push' | 'in_app' | 'email';

  @Column('varchar', { length: 64 })
  type!: string;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text', { nullable: true })
  body!: string | null;

  @Column('json', { nullable: true })
  data!: unknown | null;

  @Column('datetime', { nullable: true })
  read_at!: Date | null;

  @Column('datetime', { nullable: true })
  sent_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
