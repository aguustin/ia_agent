import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum TenantPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export interface TenantLimits {
  maxProjects: number;
  maxDocumentsPerProject: number;
  maxAnalysesPerMonth: number;
  maxStorageGb: number;
}

const PLAN_LIMITS: Record<TenantPlan, TenantLimits> = {
  [TenantPlan.FREE]: {
    maxProjects: 3,
    maxDocumentsPerProject: 10,
    maxAnalysesPerMonth: 20,
    maxStorageGb: 1,
  },
  [TenantPlan.STARTER]: {
    maxProjects: 20,
    maxDocumentsPerProject: 50,
    maxAnalysesPerMonth: 200,
    maxStorageGb: 10,
  },
  [TenantPlan.PROFESSIONAL]: {
    maxProjects: 100,
    maxDocumentsPerProject: 200,
    maxAnalysesPerMonth: 1000,
    maxStorageGb: 50,
  },
  [TenantPlan.ENTERPRISE]: {
    maxProjects: -1,
    maxDocumentsPerProject: -1,
    maxAnalysesPerMonth: -1,
    maxStorageGb: 500,
  },
};

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 63 })
  slug: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: TenantPlan,
    default: TenantPlan.FREE,
  })
  plan: TenantPlan;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  @Exclude()
  settings: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get limits(): TenantLimits {
    return PLAN_LIMITS[this.plan];
  }
}
