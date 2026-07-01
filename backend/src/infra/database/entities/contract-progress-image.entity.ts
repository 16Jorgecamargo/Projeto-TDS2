import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContractProgressUpdate } from './contract-progress-update.entity.js';

@Entity('contract_progress_images')
export class ContractProgressImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  progress_update_id!: string;

  @ManyToOne(() => ContractProgressUpdate)
  @JoinColumn({ name: 'progress_update_id' })
  progress_update!: ContractProgressUpdate;

  @Column('varchar', { length: 512 })
  image_url!: string;

  @CreateDateColumn()
  created_at!: Date;
}
