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

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('char', { length: 36 })
  user_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('varchar', { length: 64, nullable: true })
  label!: string | null;

  @Column('varchar', { length: 255 })
  street!: string;

  @Column('varchar', { length: 20 })
  number!: string;

  @Column('varchar', { length: 255, nullable: true })
  complement!: string | null;

  @Column('varchar', { length: 128 })
  district!: string;

  @Column('varchar', { length: 128 })
  city!: string;

  @Column('char', { length: 2 })
  state!: string;

  @Column('varchar', { length: 9 })
  zip_code!: string;

  @Column('char', { length: 2, default: 'BR' })
  country!: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude!: string | null;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude!: string | null;

  @Column('boolean', { default: false })
  is_primary!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
