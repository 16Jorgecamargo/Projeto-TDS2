import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column('varchar', { length: 255 })
  email!: string;

  @Index({ unique: true })
  @Column('varchar', { length: 20, nullable: true })
  phone!: string | null;

  @Column('varchar', { length: 255 })
  password_hash!: string;

  @Column({ type: 'enum', enum: ['client', 'professional', 'admin'] })
  role!: 'client' | 'professional' | 'admin';

  @Column('varchar', { length: 255 })
  full_name!: string;

  @Index({ unique: true })
  @Column('varchar', { length: 14, nullable: true })
  cpf!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  avatar_url!: string | null;

  @Column({ type: 'enum', enum: ['active', 'suspended', 'deleted'], default: 'active' })
  status!: 'active' | 'suspended' | 'deleted';

  @Column('datetime', { nullable: true })
  email_verified_at!: Date | null;

  @Column('datetime', { nullable: true })
  phone_verified_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
