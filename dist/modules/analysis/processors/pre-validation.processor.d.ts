import { WorkerHost } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { DocumentPreValidationService } from '../services/document-pre-validation.service';
import { PreValidationRecord } from '../entities/pre-validation-record.entity';
export interface PreValidationJobData {
    recordId: string;
    documentId: string;
    tenantId: string;
}
export declare class PreValidationProcessor extends WorkerHost {
    private readonly recordRepo;
    private readonly preValidationService;
    private readonly logger;
    constructor(recordRepo: Repository<PreValidationRecord>, preValidationService: DocumentPreValidationService);
    process(job: Job<PreValidationJobData>): Promise<void>;
}
