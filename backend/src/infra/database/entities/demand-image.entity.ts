import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceDemand } from './service-demand.entity.js';

@Entity('demand_images')
export class DemandImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  demand_id!: string;

  @ManyToOne(() => ServiceDemand)
  @JoinColumn({ name: 'demand_id' })
  demand!: ServiceDemand;

  @Column('varchar', { length: 512 })
  image_url!: string;

  @Column('int', { default: 0 })
  position!: number;

  @CreateDateColumn()
  created_at!: Date;
}
