import { WorkerHost } from '@nestjs/bullmq';
import { DataSource, Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Analysis } from '../entities/analysis.entity';
import { Document } from '@modules/documents/entities/document.entity';
import { IAIProvider } from '@providers/ai/ai-provider.interface';
import { FileStorageService } from '@providers/storage/file-storage.interface';
import { TextExtractorService } from '../services/text-extractor.service';
export interface AnalysisJobData {
    analysisId: string;
    documentId: string;
    projectId: string;
    tenantId: string;
    projectName: string;
    projectDescription?: string;
}
export declare class DocumentAnalysisProcessor extends WorkerHost {
    private readonly analysisRepo;
    private readonly documentRepo;
    private readonly ai;
    private readonly fileStorage;
    private readonly textExtractor;
    private readonly dataSource;
    private readonly logger;
    constructor(analysisRepo: Repository<Analysis>, documentRepo: Repository<Document>, ai: IAIProvider, fileStorage: FileStorageService, textExtractor: TextExtractorService, dataSource: DataSource);
    process(job: Job<AnalysisJobData>): Promise<void>;
    private saveResults;
}
