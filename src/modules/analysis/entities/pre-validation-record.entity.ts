import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Document } from '@modules/documents/entities/document.entity';

export enum PreValidationStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('pre_validation_records')
@Index(['documentId', 'tenantId'])
@Index(['documentId', 'status'])
export class PreValidationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PreValidationStatus,
    default: PreValidationStatus.QUEUED,
  })
  status: PreValidationStatus;

  /** Required items absent or incomplete in the document. Null until completed. */
  @Column({ type: 'jsonb', nullable: true })
  faltantes: string[] | null;

  /** Regulatory non-compliance issues or data errors. Null until completed. */
  @Column({ type: 'jsonb', nullable: true })
  errores: string[] | null;

  /** Items requiring attention but not outright errors. Null until completed. */
  @Column({ type: 'jsonb', nullable: true })
  advertencias: string[] | null;

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

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
