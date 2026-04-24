import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '@modules/projects/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';

export enum DocumentStatus {
  PENDING_UPLOAD = 'pending_upload',
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  ERROR = 'error',
}

export enum DocumentType {
  ARCHITECTURAL = 'architectural',
  STRUCTURAL = 'structural',
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  HVAC = 'hvac',
  SURVEY = 'survey',
  ENVIRONMENTAL = 'environmental',
  REPORT = 'report',
  OTHER = 'other',
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isAllowedMimeType(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

@Entity('documents')
@Index(['projectId', 'status'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'original_name', length: 255 })
  originalName: string;

  @Column({ name: 'file_key' })
  fileKey: string;

  @Column({ name: 'mime_type', length: 127 })
  mimeType: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', default: 0 })
  fileSizeBytes: number;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING_UPLOAD,
  })
  status: DocumentStatus;

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.OTHER,
    name: 'document_type',
  })
  documentType: DocumentType;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'uploaded_by_id' })
  uploadedById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
