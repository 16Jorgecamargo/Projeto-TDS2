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
import { User } from './user.entity.js';
import { ServiceCategory } from './service-category.entity.js';
import { Address } from './address.entity.js';

@Entity('service_demands')
export class ServiceDemand {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  client_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client!: User;

  @Index()
  @Column('char', { length: 36 })
  category_id!: string;

  @ManyToOne(() => ServiceCategory)
  @JoinColumn({ name: 'category_id' })
  category!: ServiceCategory;

  @Column('char', { length: 36, nullable: true })
  address_id!: string | null;

  @ManyToOne(() => Address, { nullable: true })
  @JoinColumn({ name: 'address_id' })
  address!: Address | null;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text')
  description!: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget_min!: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget_max!: string | null;

  @Column({ type: 'enum', enum: ['open', 'in_progress', 'closed', 'cancelled'], default: 'open' })
  status!: 'open' | 'in_progress' | 'closed' | 'cancelled';

  @Column('date', { nullable: true })
  preferred_date!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
