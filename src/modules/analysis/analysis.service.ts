import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Analysis, AnalysisStatus } from './entities/analysis.entity';
import { PreValidationRecord, PreValidationStatus } from './entities/pre-validation-record.entity';
import { AnalysisJobData } from './processors/document-analysis.processor';
import { PreValidationJobData } from './processors/pre-validation.processor';
import { PaginationDto, paginate, PaginatedResult } from '@common/dto/pagination.dto';
import {
  ConflictException,
  ResourceNotFoundException,
  UnprocessableEntityException,
} from '@common/exceptions/domain.exception';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { DocumentsService } from '@modules/documents/documents.service';
import { ProjectsService } from '@modules/projects/projects.service';
import { DocumentStatus } from '@modules/documents/entities/document.entity';
import { QUEUES, JOBS } from '@common/constants/queues.constant';
import { IssueSeverity } from '@providers/ai/ai-provider.interface';
import {
  ComplianceDto,
  DocumentAnalysisSummaryDto,
  IssueDto,
  PreValidationSummaryDto,
} from './dto/document-analysis-summary.dto';

const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  [IssueSeverity.CRITICAL]: 0,
  [IssueSeverity.HIGH]: 1,
  [IssueSeverity.MEDIUM]: 2,
  [IssueSeverity.LOW]: 3,
  [IssueSeverity.INFO]: 4,
};

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    @InjectRepository(Analysis)
    private readonly analysisRepo: Repository<Analysis>,
    @InjectRepository(PreValidationRecord)
    private readonly preValidationRepo: Repository<PreValidationRecord>,
    @InjectQueue(QUEUES.ANALYSIS)
    private readonly analysisQueue: Queue<AnalysisJobData>,
    @InjectQueue(QUEUES.PRE_VALIDATION)
    private readonly preValidationQueue: Queue<PreValidationJobData>,
    private readonly documentsService: DocumentsService,
    private readonly projectsService: ProjectsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Full compliance analysis
  // ---------------------------------------------------------------------------

  async triggerAnalysis(
    documentId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ): Promise<Analysis> {
    const document = await this.documentsService.findById(documentId, projectId, actor.tenantId);

    if (document.status === DocumentStatus.PENDING_UPLOAD) {
      throw new UnprocessableEntityException(
        'Document has not been uploaded yet. Complete the upload before triggering analysis.',
      );
    }

    if (document.status === DocumentStatus.PROCESSING) {
      throw new ConflictException('Document is already being analyzed');
    }

    const existingActive = await this.analysisRepo.findOne({
      where: [
        { documentId, status: AnalysisStatus.QUEUED },
        { documentId, status: AnalysisStatus.PROCESSING },
      ],
    });

    if (existingActive) {
      throw new ConflictException('An analysis for this document is already active');
    }

    const project = await this.projectsService.findById(projectId, actor.tenantId);

    const analysis = this.analysisRepo.create({
      documentId,
      projectId,
      tenantId: actor.tenantId,
      status: AnalysisStatus.QUEUED,
    });

    const saved = await this.analysisRepo.save(analysis);

    const jobData: AnalysisJobData = {
      analysisId: saved.id,
      documentId,
      projectId,
      tenantId: actor.tenantId,
      projectName: project.name,
      projectDescription: project.description ?? undefined,
    };

    try {
      const job = await this.analysisQueue.add(JOBS.ANALYZE_DOCUMENT, jobData, {
        attempts: parseInt(process.env.ANALYSIS_JOB_ATTEMPTS ?? '3', 10),
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.ANALYSIS_JOB_BACKOFF_DELAY ?? '5000', 10),
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      });
      this.logger.log(`Analysis job ${job.id} queued for document ${documentId}`);
    } catch (queueError) {
      this.logger.error(
        `Failed to enqueue analysis for document ${documentId}: ${queueError}`,
      );
      await this.analysisRepo.update(saved.id, {
        status: AnalysisStatus.FAILED,
        errorMessage: 'Failed to enqueue analysis job',
        completedAt: new Date(),
      });
      throw queueError;
    }

    return saved;
  }

  async findByDocument(
    documentId: string,
    projectId: string,
    tenantId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Analysis>> {
    await this.documentsService.findById(documentId, projectId, tenantId);

    const [data, total] = await this.analysisRepo.findAndCount({
      where: { documentId, tenantId },
      relations: ['issues'],
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return paginate(data, total, pagination);
  }

  async findById(id: string, tenantId: string): Promise<Analysis> {
    const analysis = await this.analysisRepo.findOne({
      where: { id, tenantId },
      relations: ['issues', 'document'],
    });

    if (!analysis) throw new ResourceNotFoundException('Analysis', id);
    return analysis;
  }

  /**
   * Returns the latest compliance analysis and the latest pre-validation record
   * for a document in a single optimized call (3 parallel DB queries).
   * Issues are sorted by severity (critical → info).
   */
  async getDocumentAnalysisSummary(
    documentId: string,
    projectId: string,
    tenantId: string,
  ): Promise<DocumentAnalysisSummaryDto> {
    // All three queries run in parallel. findById throws 404 if the document
    // doesn't exist, which is the desired guard for the other two results.
    const [, analysis, preValidation] = await Promise.all([
      this.documentsService.findById(documentId, projectId, tenantId),
      this.analysisRepo.findOne({
        where: { documentId, tenantId },
        relations: { issues: true },
        order: { createdAt: 'DESC' },
      }),
      this.preValidationRepo.findOne({
        where: { documentId, tenantId },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return {
      documentId,
      compliance: analysis ? this.mapCompliance(analysis) : null,
      preValidation: preValidation ? this.mapPreValidation(preValidation) : null,
    };
  }

  private mapCompliance(analysis: Analysis): ComplianceDto {
    const issues: IssueDto[] = [...(analysis.issues ?? [])]
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5))
      .map((issue) => ({
        severity: issue.severity,
        type: issue.type,
        description: issue.description,
        location: issue.location,
        recommendation: issue.recommendation,
        regulation: issue.regulation,
      }));

    return {
      analysisId: analysis.id,
      status: analysis.status,
      complianceScore: analysis.complianceScore,
      summary: analysis.summary,
      issues,
      errorMessage: analysis.errorMessage,
      completedAt: analysis.completedAt,
    };
  }

  private mapPreValidation(record: PreValidationRecord): PreValidationSummaryDto {
    return {
      recordId: record.id,
      status: record.status,
      faltantes: record.faltantes ?? [],
      errores: record.errores ?? [],
      advertencias: record.advertencias ?? [],
      completedAt: record.completedAt,
    };
  }

  async findByProject(
    projectId: string,
    tenantId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Analysis>> {
    await this.projectsService.findById(projectId, tenantId);

    const [data, total] = await this.analysisRepo.findAndCount({
      where: { projectId, tenantId },
      relations: ['document', 'issues'],
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return paginate(data, total, pagination);
  }

  async getProjectAnalysisSummary(
    projectId: string,
    tenantId: string,
  ): Promise<{
    totalAnalyses: number;
    completed: number;
    avgComplianceScore: number | null;
    criticalIssues: number;
  }> {
    const result = await this.analysisRepo
      .createQueryBuilder('analysis')
      .leftJoin('analysis.issues', 'issue')
      .where('analysis.projectId = :projectId', { projectId })
      .andWhere('analysis.tenantId = :tenantId', { tenantId })
      .select('COUNT(DISTINCT analysis.id)', 'totalAnalyses')
      .addSelect(
        `COUNT(DISTINCT CASE WHEN analysis.status = 'completed' THEN analysis.id END)`,
        'completed',
      )
      .addSelect('AVG(analysis.complianceScore)', 'avgComplianceScore')
      .addSelect(
        `COUNT(CASE WHEN issue.severity = 'critical' THEN 1 END)`,
        'criticalIssues',
      )
      .getRawOne<{
        totalAnalyses: string;
        completed: string;
        avgComplianceScore: string | null;
        criticalIssues: string;
      }>();

    return {
      totalAnalyses: parseInt(result?.totalAnalyses ?? '0', 10),
      completed: parseInt(result?.completed ?? '0', 10),
      avgComplianceScore: result?.avgComplianceScore
        ? parseFloat(result.avgComplianceScore)
        : null,
      criticalIssues: parseInt(result?.criticalIssues ?? '0', 10),
    };
  }

  // ---------------------------------------------------------------------------
  // Pre-validation (producer)
  // ---------------------------------------------------------------------------

  /**
   * Validates the document exists, creates a PreValidationRecord, and enqueues
   * a job. Returns the record immediately so the client can poll for status.
   *
   * Throws ConflictException if a job for this document is already queued.
   * Throws UnprocessableEntityException if the document is not yet uploaded.
   */
  async triggerPreValidation(
    documentId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ): Promise<PreValidationRecord> {
    const document = await this.documentsService.findById(documentId, projectId, actor.tenantId);

    if (document.status === DocumentStatus.PENDING_UPLOAD) {
      throw new UnprocessableEntityException(
        'Document has not been uploaded yet. Complete the upload before triggering pre-validation.',
      );
    }

    const existingActive = await this.preValidationRepo.findOne({
      where: [
        { documentId, status: PreValidationStatus.QUEUED },
        { documentId, status: PreValidationStatus.PROCESSING },
      ],
    });

    if (existingActive) {
      throw new ConflictException('A pre-validation for this document is already active.');
    }

    const record = this.preValidationRepo.create({
      documentId,
      projectId,
      tenantId: actor.tenantId,
      status: PreValidationStatus.QUEUED,
    });

    const saved = await this.preValidationRepo.save(record);

    const jobData: PreValidationJobData = {
      recordId: saved.id,
      documentId,
      tenantId: actor.tenantId,
    };

    try {
      const job = await this.preValidationQueue.add(JOBS.PRE_VALIDATE_DOCUMENT, jobData, {
        attempts: parseInt(process.env.PRE_VALIDATION_JOB_ATTEMPTS ?? '3', 10),
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.PRE_VALIDATION_JOB_BACKOFF_DELAY ?? '3000', 10),
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      });
      this.logger.log(
        `Pre-validation job ${job.id} queued — record: ${saved.id}, document: ${documentId}`,
      );
    } catch (queueError) {
      this.logger.error(
        `Failed to enqueue pre-validation for document ${documentId}: ${queueError}`,
      );
      await this.preValidationRepo.update(saved.id, {
        status: PreValidationStatus.FAILED,
        errorMessage: 'Failed to enqueue pre-validation job',
        completedAt: new Date(),
      });
      throw queueError;
    }

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Pre-validation (query)
  // ---------------------------------------------------------------------------

  async findPreValidationsByDocument(
    documentId: string,
    projectId: string,
    tenantId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<PreValidationRecord>> {
    await this.documentsService.findById(documentId, projectId, tenantId);

    const [data, total] = await this.preValidationRepo.findAndCount({
      where: { documentId, tenantId },
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return paginate(data, total, pagination);
  }

  async findPreValidationById(id: string, tenantId: string): Promise<PreValidationRecord> {
    const record = await this.preValidationRepo.findOne({ where: { id, tenantId } });
    if (!record) throw new ResourceNotFoundException('PreValidationRecord', id);
    return record;
  }
}
