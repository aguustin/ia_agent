import { Repository } from 'typeorm';
import { ProjectsService } from '@modules/projects/projects.service';
import { Document } from '@modules/documents/entities/document.entity';
import { Analysis } from '@modules/analysis/entities/analysis.entity';
import { PreValidationRecord } from '@modules/analysis/entities/pre-validation-record.entity';
export declare class ChatContextService {
    private readonly documentRepo;
    private readonly analysisRepo;
    private readonly preValidationRepo;
    private readonly projectsService;
    constructor(documentRepo: Repository<Document>, analysisRepo: Repository<Analysis>, preValidationRepo: Repository<PreValidationRecord>, projectsService: ProjectsService);
    buildSystemContext(projectId: string, tenantId: string): Promise<string>;
    private fetchDocuments;
    private fetchPreValidations;
    private fetchAnalyses;
    private prioritiseIssues;
    private formatProject;
    private formatDocuments;
    private formatPreValidations;
    private formatAnalyses;
    private bytesLabel;
    private mimeLabel;
    private statusLabel;
}
