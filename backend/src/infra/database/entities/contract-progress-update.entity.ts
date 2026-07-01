import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contract } from './contract.entity.js';
import { User } from './user.entity.js';

@Entity('contract_progress_updates')
export class ContractProgressUpdate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column('char', { length: 36 })
  author_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @Column('text')
  description!: string;

  @Column('int', { nullable: true })
  percentage!: number | null;

  @CreateDateColumn()
  created_at!: Date;
}
