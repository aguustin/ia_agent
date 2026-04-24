import { Document } from '@modules/documents/entities/document.entity';
export declare enum PreValidationStatus {
    QUEUED = "queued",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare class PreValidationRecord {
    id: string;
    status: PreValidationStatus;
    faltantes: string[] | null;
    errores: string[] | null;
    advertencias: string[] | null;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    documentId: string;
    document: Document;
    projectId: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}
