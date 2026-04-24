import { DocumentType } from '../entities/document.entity';
export declare class RequestUploadDto {
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    documentType?: DocumentType;
}
