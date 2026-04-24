import { IssueType, IssueSeverity } from '@providers/ai/ai-provider.interface';
import { AnalysisStatus } from '../entities/analysis.entity';
import { PreValidationStatus } from '../entities/pre-validation-record.entity';
export declare class IssueDto {
    severity: IssueSeverity;
    type: IssueType;
    description: string;
    location: string | null;
    recommendation: string | null;
    regulation: string | null;
}
export declare class ComplianceDto {
    analysisId: string;
    status: AnalysisStatus;
    complianceScore: number | null;
    summary: string | null;
    issues: IssueDto[];
    errorMessage: string | null;
    completedAt: Date | null;
}
export declare class PreValidationSummaryDto {
    recordId: string;
    status: PreValidationStatus;
    faltantes: string[];
    errores: string[];
    advertencias: string[];
    completedAt: Date | null;
}
export declare class DocumentAnalysisSummaryDto {
    documentId: string;
    compliance: ComplianceDto | null;
    preValidation: PreValidationSummaryDto | null;
}
