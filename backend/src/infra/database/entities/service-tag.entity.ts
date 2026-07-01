import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('service_tags')
export class ServiceTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 128 })
  name!: string;

  @Index({ unique: true })
  @Column('varchar', { length: 160 })
  slug!: string;

  @CreateDateColumn()
  created_at!: Date;
}
