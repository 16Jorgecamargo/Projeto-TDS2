import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from './contract.entity.js';
import { User } from './user.entity.js';

@Entity('reviews')
@Unique(['contract_id', 'reviewer_id'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  contract_id!: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column('char', { length: 36 })
  reviewer_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: User;

  @Index()
  @Column('char', { length: 36 })
  reviewee_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewee_id' })
  reviewee!: User;

  @Column('int')
  rating!: number;

  @Column('text', { nullable: true })
  comment!: string | null;

  @Column('text', { nullable: true })
  response!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
