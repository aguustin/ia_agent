import { Project } from '@modules/projects/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';
export declare enum DocumentStatus {
    PENDING_UPLOAD = "pending_upload",
    UPLOADED = "uploaded",
    PROCESSING = "processing",
    PROCESSED = "processed",
    ERROR = "error"
}
export declare enum DocumentType {
    ARCHITECTURAL = "architectural",
    STRUCTURAL = "structural",
    ELECTRICAL = "electrical",
    PLUMBING = "plumbing",
    HVAC = "hvac",
    SURVEY = "survey",
    ENVIRONMENTAL = "environmental",
    REPORT = "report",
    OTHER = "other"
}
declare const ALLOWED_MIME_TYPES: readonly ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "image/jpeg", "image/png", "image/tiff", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export declare function isAllowedMimeType(mime: string): mime is AllowedMimeType;
export declare const MAX_FILE_SIZE_BYTES: number;
export declare class Document {
    id: string;
    name: string;
    originalName: string;
    fileKey: string;
    mimeType: string;
    fileSizeBytes: number;
    status: DocumentStatus;
    documentType: DocumentType;
    projectId: string;
    project: Project;
    uploadedById: string;
    uploadedBy: User;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}
export {};
