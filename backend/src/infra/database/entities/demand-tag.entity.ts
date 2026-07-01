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
import { ServiceDemand } from './service-demand.entity.js';
import { ServiceTag } from './service-tag.entity.js';

@Entity('demand_tags')
@Unique(['demand_id', 'tag_id'])
export class DemandTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  demand_id!: string;

  @ManyToOne(() => ServiceDemand)
  @JoinColumn({ name: 'demand_id' })
  demand!: ServiceDemand;

  @Index()
  @Column('char', { length: 36 })
  tag_id!: string;

  @ManyToOne(() => ServiceTag)
  @JoinColumn({ name: 'tag_id' })
  tag!: ServiceTag;

  @CreateDateColumn()
  created_at!: Date;
}
