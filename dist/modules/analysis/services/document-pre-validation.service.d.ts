import { Repository } from 'typeorm';
import { IAIProvider, PreValidationResult } from '@providers/ai/ai-provider.interface';
import { FileStorageService } from '@providers/storage/file-storage.interface';
import { Document } from '@modules/documents/entities/document.entity';
import { TextExtractorService } from './text-extractor.service';
export declare class DocumentPreValidationService {
    private readonly documentRepo;
    private readonly fileStorage;
    private readonly ai;
    private readonly textExtractor;
    private readonly logger;
    constructor(documentRepo: Repository<Document>, fileStorage: FileStorageService, ai: IAIProvider, textExtractor: TextExtractorService);
    analyzeDocument(documentId: string, tenantId: string): Promise<PreValidationResult>;
    private loadDocument;
    private downloadFile;
    private extractText;
    buildPrompt(contenido: string): string;
    private callAI;
    parseResponse(response: string): PreValidationResult;
    private extractJsonBlock;
    private validateResult;
}
