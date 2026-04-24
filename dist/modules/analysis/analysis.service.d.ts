import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { Analysis } from './entities/analysis.entity';
import { PreValidationRecord } from './entities/pre-validation-record.entity';
import { AnalysisJobData } from './processors/document-analysis.processor';
import { PreValidationJobData } from './processors/pre-validation.processor';
import { PaginationDto, PaginatedResult } from '@common/dto/pagination.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { DocumentsService } from '@modules/documents/documents.service';
import { ProjectsService } from '@modules/projects/projects.service';
import { DocumentAnalysisSummaryDto } from './dto/document-analysis-summary.dto';
export declare class AnalysisService {
    private readonly analysisRepo;
    private readonly preValidationRepo;
    private readonly analysisQueue;
    private readonly preValidationQueue;
    private readonly documentsService;
    private readonly projectsService;
    private readonly logger;
    constructor(analysisRepo: Repository<Analysis>, preValidationRepo: Repository<PreValidationRecord>, analysisQueue: Queue<AnalysisJobData>, preValidationQueue: Queue<PreValidationJobData>, documentsService: DocumentsService, projectsService: ProjectsService);
    triggerAnalysis(documentId: string, projectId: string, actor: AuthenticatedUser): Promise<Analysis>;
    findByDocument(documentId: string, projectId: string, tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<Analysis>>;
    findById(id: string, tenantId: string): Promise<Analysis>;
    getDocumentAnalysisSummary(documentId: string, projectId: string, tenantId: string): Promise<DocumentAnalysisSummaryDto>;
    private mapCompliance;
    private mapPreValidation;
    findByProject(projectId: string, tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<Analysis>>;
    getProjectAnalysisSummary(projectId: string, tenantId: string): Promise<{
        totalAnalyses: number;
        completed: number;
        avgComplianceScore: number | null;
        criticalIssues: number;
    }>;
    triggerPreValidation(documentId: string, projectId: string, actor: AuthenticatedUser): Promise<PreValidationRecord>;
    findPreValidationsByDocument(documentId: string, projectId: string, tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<PreValidationRecord>>;
    findPreValidationById(id: string, tenantId: string): Promise<PreValidationRecord>;
}
