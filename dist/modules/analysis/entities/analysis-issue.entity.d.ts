import { Analysis } from './analysis.entity';
import { IssueType, IssueSeverity } from '@providers/ai/ai-provider.interface';
export declare class AnalysisIssue {
    id: string;
    type: IssueType;
    severity: IssueSeverity;
    description: string;
    location: string | null;
    recommendation: string | null;
    regulation: string | null;
    analysisId: string;
    analysis: Analysis;
    createdAt: Date;
}
