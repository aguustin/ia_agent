import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Analysis } from './analysis.entity';
import { IssueType, IssueSeverity } from '@providers/ai/ai-provider.interface';

@Entity('analysis_issues')
@Index(['analysisId', 'severity'])
export class AnalysisIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: IssueType })
  type: IssueType;

  @Column({ type: 'enum', enum: IssueSeverity })
  severity: IssueSeverity;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  location: string | null;

  @Column({ type: 'text', nullable: true })
  recommendation: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  regulation: string | null;

  @Column({ name: 'analysis_id' })
  analysisId: string;

  @ManyToOne(() => Analysis, (analysis) => analysis.issues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'analysis_id' })
  analysis: Analysis;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
