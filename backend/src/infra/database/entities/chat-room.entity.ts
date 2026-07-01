import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from './contract.entity.js';
import { User } from './user.entity.js';

@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 36, nullable: true })
  contract_id!: string | null;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract | null;

  @Index()
  @Column('char', { length: 36 })
  client_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client!: User;

  @Index()
  @Column('char', { length: 36 })
  professional_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'professional_id' })
  professional!: User;

  @Column('datetime', { nullable: true })
  last_message_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
