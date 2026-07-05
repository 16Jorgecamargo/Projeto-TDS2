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

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text')
  description!: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget_min!: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget_max!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  street!: string | null;

  @Column('varchar', { length: 20, nullable: true })
  number!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  complement!: string | null;

  @Column('varchar', { length: 128, nullable: true })
  district!: string | null;

  @Column('varchar', { length: 128, nullable: true })
  city!: string | null;

  @Column('char', { length: 2, nullable: true })
  state!: string | null;

  @Column('varchar', { length: 9, nullable: true })
  zip_code!: string | null;

  @Column({ type: 'enum', enum: ['open', 'in_progress', 'closed', 'cancelled'], default: 'open' })
  status!: 'open' | 'in_progress' | 'closed' | 'cancelled';

  @Column('date', { nullable: true })
  preferred_date!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
