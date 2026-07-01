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

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 36, nullable: true })
  parent_id!: string | null;

  @ManyToOne(() => ServiceCategory, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent!: ServiceCategory | null;

  @Column('varchar', { length: 128 })
  name!: string;

  @Index({ unique: true })
  @Column('varchar', { length: 160 })
  slug!: string;

  @Column('varchar', { length: 128, nullable: true })
  icon!: string | null;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('boolean', { default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
