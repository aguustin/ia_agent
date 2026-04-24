import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Document } from '@modules/documents/entities/document.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { AnalysisIssue } from './analysis-issue.entity';

export enum AnalysisStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('analyses')
@Index(['documentId', 'status'])
@Index(['projectId', 'createdAt'])
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    default: AnalysisStatus.QUEUED,
  })
  status: AnalysisStatus;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({
    name: 'compliance_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  complianceScore: number | null;

  @Column({ type: 'jsonb', nullable: true })
  recommendations: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'document_id' })
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @OneToMany(() => AnalysisIssue, (issue) => issue.analysis, { cascade: true })
  issues: AnalysisIssue[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
