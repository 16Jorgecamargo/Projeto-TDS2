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

@Entity('audit_logs')
@Index(['entity_type', 'entity_id'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36, nullable: true })
  user_id!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column('varchar', { length: 128 })
  action!: string;

  @Column('varchar', { length: 64, nullable: true })
  entity_type!: string | null;

  @Column('char', { length: 36, nullable: true })
  entity_id!: string | null;

  @Column('varchar', { length: 64, nullable: true })
  ip_address!: string | null;

  @Column('varchar', { length: 512, nullable: true })
  user_agent!: string | null;

  @Column('json', { nullable: true })
  metadata!: unknown | null;

  @CreateDateColumn()
  created_at!: Date;
}
