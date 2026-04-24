import { AnalysisService } from './analysis.service';
import { DocumentAnalysisSummaryDto } from './dto/document-analysis-summary.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
export declare class AnalysisController {
    private readonly analysisService;
    constructor(analysisService: AnalysisService);
    triggerAnalysis(projectId: string, documentId: string, user: AuthenticatedUser): Promise<import("./entities/analysis.entity").Analysis>;
    getDocumentAnalysisSummary(projectId: string, documentId: string, user: AuthenticatedUser): Promise<DocumentAnalysisSummaryDto>;
    findByDocument(projectId: string, documentId: string, pagination: PaginationDto, user: AuthenticatedUser): Promise<import("@common/dto/pagination.dto").PaginatedResult<import("./entities/analysis.entity").Analysis>>;
    findByProject(projectId: string, pagination: PaginationDto, user: AuthenticatedUser): Promise<import("@common/dto/pagination.dto").PaginatedResult<import("./entities/analysis.entity").Analysis>>;
    getProjectSummary(projectId: string, user: AuthenticatedUser): Promise<{
        totalAnalyses: number;
        completed: number;
        avgComplianceScore: number | null;
        criticalIssues: number;
    }>;
    findOne(analysisId: string, user: AuthenticatedUser): Promise<import("./entities/analysis.entity").Analysis>;
    triggerPreValidation(projectId: string, documentId: string, user: AuthenticatedUser): Promise<import("./entities/pre-validation-record.entity").PreValidationRecord>;
    findPreValidationsByDocument(projectId: string, documentId: string, pagination: PaginationDto, user: AuthenticatedUser): Promise<import("@common/dto/pagination.dto").PaginatedResult<import("./entities/pre-validation-record.entity").PreValidationRecord>>;
    findPreValidationById(recordId: string, user: AuthenticatedUser): Promise<import("./entities/pre-validation-record.entity").PreValidationRecord>;
}
