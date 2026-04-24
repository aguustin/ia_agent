import { Document } from '@modules/documents/entities/document.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { AnalysisIssue } from './analysis-issue.entity';
export declare enum AnalysisStatus {
    QUEUED = "queued",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare class Analysis {
    id: string;
    status: AnalysisStatus;
    summary: string | null;
    complianceScore: number | null;
    recommendations: string[] | null;
    metadata: Record<string, unknown> | null;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    documentId: string;
    document: Document;
    projectId: string;
    project: Project;
    tenantId: string;
    issues: AnalysisIssue[];
    createdAt: Date;
    updatedAt: Date;
}
