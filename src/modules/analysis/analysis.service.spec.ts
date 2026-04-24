import 'multer';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { AnalysisService } from './analysis.service';
import { Analysis, AnalysisStatus } from './entities/analysis.entity';
import { PreValidationRecord, PreValidationStatus } from './entities/pre-validation-record.entity';
import { DocumentsService } from '@modules/documents/documents.service';
import { ProjectsService } from '@modules/projects/projects.service';
import { Document, DocumentStatus, DocumentType } from '@modules/documents/entities/document.entity';
import {
  ConflictException,
  ResourceNotFoundException,
  UnprocessableEntityException,
} from '@common/exceptions/domain.exception';
import { QUEUES, JOBS } from '@common/constants/queues.constant';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PaginationDto } from '@common/dto/pagination.dto';
import { IssueType, IssueSeverity } from '@providers/ai/ai-provider.interface';
import { AnalysisIssue } from './entities/analysis-issue.entity';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-aaa';
const PROJECT_ID = 'proj-bbb';
const DOC_ID = 'doc-ccc';
const ANALYSIS_ID = 'analysis-ddd';
const RECORD_ID = 'record-eee';

const actor: AuthenticatedUser = {
  id: 'user-111',
  email: 'user@test.com',
  role: 'admin' as any,
  tenantId: TENANT_ID,
};

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: DOC_ID,
    name: 'plano.pdf',
    originalName: 'plano.pdf',
    fileKey: 'tenants/t/p/d/plano.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1024,
    status: DocumentStatus.UPLOADED,
    documentType: DocumentType.ARCHITECTURAL,
    projectId: PROJECT_ID,
    uploadedById: actor.id,
    tenantId: TENANT_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: null as any,
    uploadedBy: null as any,
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    id: ANALYSIS_ID,
    status: AnalysisStatus.QUEUED,
    summary: null,
    complianceScore: null,
    recommendations: null,
    metadata: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    documentId: DOC_ID,
    projectId: PROJECT_ID,
    tenantId: TENANT_ID,
    issues: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    document: null as any,
    project: null as any,
    ...overrides,
  };
}

function makePreValidationRecord(overrides: Partial<PreValidationRecord> = {}): PreValidationRecord {
  return {
    id: RECORD_ID,
    status: PreValidationStatus.QUEUED,
    faltantes: null,
    errores: null,
    advertencias: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    documentId: DOC_ID,
    projectId: PROJECT_ID,
    tenantId: TENANT_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    document: null as any,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AnalysisService', () => {
  let service: AnalysisService;

  let analysisRepo: jest.Mocked<Record<string, jest.Mock>>;
  let preValidationRepo: jest.Mocked<Record<string, jest.Mock>>;
  let analysisQueue: jest.Mocked<Record<string, jest.Mock>>;
  let preValidationQueue: jest.Mocked<Record<string, jest.Mock>>;
  let documentsService: jest.Mocked<Record<string, jest.Mock>>;
  let projectsService: jest.Mocked<Record<string, jest.Mock>>;

  beforeEach(async () => {
    analysisRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    preValidationRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };

    analysisQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    preValidationQueue = { add: jest.fn().mockResolvedValue({ id: 'job-2' }) };

    documentsService = { findById: jest.fn().mockResolvedValue(makeDocument()) };
    projectsService = {
      findById: jest.fn().mockResolvedValue({ id: PROJECT_ID, name: 'Proyecto Test', description: null }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: getRepositoryToken(Analysis), useValue: analysisRepo },
        { provide: getRepositoryToken(PreValidationRecord), useValue: preValidationRepo },
        { provide: getQueueToken(QUEUES.ANALYSIS), useValue: analysisQueue },
        { provide: getQueueToken(QUEUES.PRE_VALIDATION), useValue: preValidationQueue },
        { provide: DocumentsService, useValue: documentsService },
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();

    service = module.get(AnalysisService);
  });

  // -------------------------------------------------------------------------
  // triggerAnalysis
  // -------------------------------------------------------------------------

  describe('triggerAnalysis', () => {
    beforeEach(() => {
      analysisRepo.findOne.mockResolvedValue(null); // no conflict by default
      analysisRepo.create.mockReturnValue(makeAnalysis());
      analysisRepo.save.mockResolvedValue(makeAnalysis());
    });

    it('creates an Analysis record and enqueues a job for an uploaded document', async () => {
      const result = await service.triggerAnalysis(DOC_ID, PROJECT_ID, actor);

      expect(documentsService.findById).toHaveBeenCalledWith(DOC_ID, PROJECT_ID, TENANT_ID);
      expect(analysisRepo.save).toHaveBeenCalled();
      expect(analysisQueue.add).toHaveBeenCalledWith(
        JOBS.ANALYZE_DOCUMENT,
        expect.objectContaining({ analysisId: ANALYSIS_ID, documentId: DOC_ID }),
        expect.any(Object),
      );
      expect(result.status).toBe(AnalysisStatus.QUEUED);
    });

    it('throws UnprocessableEntityException when document is PENDING_UPLOAD', async () => {
      documentsService.findById.mockResolvedValue(makeDocument({ status: DocumentStatus.PENDING_UPLOAD }));

      await expect(service.triggerAnalysis(DOC_ID, PROJECT_ID, actor)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(analysisQueue.add).not.toHaveBeenCalled();
    });

    it('throws ConflictException when document is already PROCESSING', async () => {
      documentsService.findById.mockResolvedValue(makeDocument({ status: DocumentStatus.PROCESSING }));

      await expect(service.triggerAnalysis(DOC_ID, PROJECT_ID, actor)).rejects.toThrow(
        ConflictException,
      );
      expect(analysisQueue.add).not.toHaveBeenCalled();
    });

    it('throws ConflictException when an Analysis record is already QUEUED', async () => {
      analysisRepo.findOne.mockResolvedValue(makeAnalysis({ status: AnalysisStatus.QUEUED }));

      await expect(service.triggerAnalysis(DOC_ID, PROJECT_ID, actor)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when an Analysis record is already PROCESSING', async () => {
      analysisRepo.findOne.mockResolvedValue(makeAnalysis({ status: AnalysisStatus.PROCESSING }));

      await expect(service.triggerAnalysis(DOC_ID, PROJECT_ID, actor)).rejects.toThrow(
        ConflictException,
      );
    });

    it('marks the Analysis record as FAILED and rethrows when queue.add throws', async () => {
      const redisError = new Error('Redis connection refused');
      analysisQueue.add.mockRejectedValue(redisError);

      await expect(service.triggerAnalysis(DOC_ID, PROJECT_ID, actor)).rejects.toThrow(
        redisError,
      );
      expect(analysisRepo.update).toHaveBeenCalledWith(
        ANALYSIS_ID,
        expect.objectContaining({ status: AnalysisStatus.FAILED }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // triggerPreValidation
  // -------------------------------------------------------------------------

  describe('triggerPreValidation', () => {
    beforeEach(() => {
      preValidationRepo.findOne.mockResolvedValue(null);
      preValidationRepo.create.mockReturnValue(makePreValidationRecord());
      preValidationRepo.save.mockResolvedValue(makePreValidationRecord());
    });

    it('creates a PreValidationRecord and enqueues a job for an uploaded document', async () => {
      const result = await service.triggerPreValidation(DOC_ID, PROJECT_ID, actor);

      expect(preValidationRepo.save).toHaveBeenCalled();
      expect(preValidationQueue.add).toHaveBeenCalledWith(
        JOBS.PRE_VALIDATE_DOCUMENT,
        expect.objectContaining({ recordId: RECORD_ID, documentId: DOC_ID }),
        expect.any(Object),
      );
      expect(result.status).toBe(PreValidationStatus.QUEUED);
    });

    it('throws UnprocessableEntityException when document is PENDING_UPLOAD', async () => {
      documentsService.findById.mockResolvedValue(makeDocument({ status: DocumentStatus.PENDING_UPLOAD }));

      await expect(service.triggerPreValidation(DOC_ID, PROJECT_ID, actor)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(preValidationQueue.add).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a pre-validation is already QUEUED', async () => {
      preValidationRepo.findOne.mockResolvedValue(
        makePreValidationRecord({ status: PreValidationStatus.QUEUED }),
      );

      await expect(service.triggerPreValidation(DOC_ID, PROJECT_ID, actor)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when a pre-validation is already PROCESSING', async () => {
      preValidationRepo.findOne.mockResolvedValue(
        makePreValidationRecord({ status: PreValidationStatus.PROCESSING }),
      );

      await expect(service.triggerPreValidation(DOC_ID, PROJECT_ID, actor)).rejects.toThrow(
        ConflictException,
      );
    });

    it('marks the PreValidationRecord as FAILED and rethrows when queue.add throws', async () => {
      const redisError = new Error('Redis connection refused');
      preValidationQueue.add.mockRejectedValue(redisError);

      await expect(service.triggerPreValidation(DOC_ID, PROJECT_ID, actor)).rejects.toThrow(
        redisError,
      );
      expect(preValidationRepo.update).toHaveBeenCalledWith(
        RECORD_ID,
        expect.objectContaining({ status: PreValidationStatus.FAILED }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe('findById', () => {
    it('returns the analysis with relations when found', async () => {
      const analysis = makeAnalysis();
      analysisRepo.findOne.mockResolvedValue(analysis);

      const result = await service.findById(ANALYSIS_ID, TENANT_ID);

      expect(analysisRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: ANALYSIS_ID, tenantId: TENANT_ID } }),
      );
      expect(result).toEqual(analysis);
    });

    it('throws ResourceNotFoundException when analysis does not exist', async () => {
      analysisRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(ANALYSIS_ID, TENANT_ID)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // findPreValidationById
  // -------------------------------------------------------------------------

  describe('findPreValidationById', () => {
    it('returns the pre-validation record when found', async () => {
      const record = makePreValidationRecord();
      preValidationRepo.findOne.mockResolvedValue(record);

      const result = await service.findPreValidationById(RECORD_ID, TENANT_ID);

      expect(result).toEqual(record);
    });

    it('throws ResourceNotFoundException when record does not exist', async () => {
      preValidationRepo.findOne.mockResolvedValue(null);

      await expect(service.findPreValidationById(RECORD_ID, TENANT_ID)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // findByDocument
  // -------------------------------------------------------------------------

  describe('findByDocument', () => {
    it('returns paginated analyses for the document', async () => {
      const analyses = [makeAnalysis()];
      analysisRepo.findAndCount.mockResolvedValue([analyses, 1]);

      const pagination = new PaginationDto();
      const result = await service.findByDocument(DOC_ID, PROJECT_ID, TENANT_ID, pagination);

      expect(result.data).toEqual(analyses);
      expect(result.meta.total).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // getDocumentAnalysisSummary
  // -------------------------------------------------------------------------

  describe('getDocumentAnalysisSummary', () => {
    function makeIssue(severity: IssueSeverity, overrides: Partial<AnalysisIssue> = {}): AnalysisIssue {
      return {
        id: `issue-${severity}`,
        type: IssueType.COMPLIANCE,
        severity,
        description: `Issue with severity ${severity}`,
        location: null,
        recommendation: null,
        regulation: null,
        analysisId: ANALYSIS_ID,
        analysis: null as any,
        createdAt: new Date(),
        ...overrides,
      };
    }

    it('runs document check, analysis query, and pre-validation query in parallel', async () => {
      analysisRepo.findOne.mockResolvedValue(makeAnalysis({ issues: [] }));
      preValidationRepo.findOne.mockResolvedValue(makePreValidationRecord({
        status: PreValidationStatus.COMPLETED,
        faltantes: ['Memoria descriptiva'],
        errores: [],
        advertencias: ['Escala no indicada'],
      }));

      const result = await service.getDocumentAnalysisSummary(DOC_ID, PROJECT_ID, TENANT_ID);

      expect(documentsService.findById).toHaveBeenCalledWith(DOC_ID, PROJECT_ID, TENANT_ID);
      expect(analysisRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { documentId: DOC_ID, tenantId: TENANT_ID } }),
      );
      expect(preValidationRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { documentId: DOC_ID, tenantId: TENANT_ID } }),
      );
      expect(result.documentId).toBe(DOC_ID);
    });

    it('maps compliance analysis fields correctly', async () => {
      analysisRepo.findOne.mockResolvedValue(
        makeAnalysis({
          status: AnalysisStatus.COMPLETED,
          complianceScore: 72.5,
          summary: 'Cumplimiento parcial.',
          errorMessage: null,
          issues: [makeIssue(IssueSeverity.HIGH)],
        }),
      );
      preValidationRepo.findOne.mockResolvedValue(null);

      const result = await service.getDocumentAnalysisSummary(DOC_ID, PROJECT_ID, TENANT_ID);

      expect(result.compliance).toMatchObject({
        analysisId: ANALYSIS_ID,
        status: AnalysisStatus.COMPLETED,
        complianceScore: 72.5,
        summary: 'Cumplimiento parcial.',
      });
      expect(result.compliance!.issues).toHaveLength(1);
      expect(result.compliance!.issues[0].severity).toBe(IssueSeverity.HIGH);
      expect(result.preValidation).toBeNull();
    });

    it('sorts issues by severity (critical first, info last)', async () => {
      const issues = [
        makeIssue(IssueSeverity.INFO),
        makeIssue(IssueSeverity.CRITICAL, { id: 'issue-critical' }),
        makeIssue(IssueSeverity.MEDIUM, { id: 'issue-medium' }),
        makeIssue(IssueSeverity.HIGH, { id: 'issue-high' }),
        makeIssue(IssueSeverity.LOW, { id: 'issue-low' }),
      ];
      analysisRepo.findOne.mockResolvedValue(makeAnalysis({ issues }));
      preValidationRepo.findOne.mockResolvedValue(null);

      const result = await service.getDocumentAnalysisSummary(DOC_ID, PROJECT_ID, TENANT_ID);

      const severities = result.compliance!.issues.map((i) => i.severity);
      expect(severities).toEqual([
        IssueSeverity.CRITICAL,
        IssueSeverity.HIGH,
        IssueSeverity.MEDIUM,
        IssueSeverity.LOW,
        IssueSeverity.INFO,
      ]);
    });

    it('maps pre-validation fields correctly and defaults null arrays to empty', async () => {
      analysisRepo.findOne.mockResolvedValue(null);
      preValidationRepo.findOne.mockResolvedValue(
        makePreValidationRecord({
          status: PreValidationStatus.COMPLETED,
          faltantes: ['Plano de situación'],
          errores: null,
          advertencias: null,
        }),
      );

      const result = await service.getDocumentAnalysisSummary(DOC_ID, PROJECT_ID, TENANT_ID);

      expect(result.compliance).toBeNull();
      expect(result.preValidation).toMatchObject({
        recordId: RECORD_ID,
        status: PreValidationStatus.COMPLETED,
        faltantes: ['Plano de situación'],
        errores: [],
        advertencias: [],
      });
    });

    it('returns both fields null when no jobs have run', async () => {
      analysisRepo.findOne.mockResolvedValue(null);
      preValidationRepo.findOne.mockResolvedValue(null);

      const result = await service.getDocumentAnalysisSummary(DOC_ID, PROJECT_ID, TENANT_ID);

      expect(result.compliance).toBeNull();
      expect(result.preValidation).toBeNull();
    });

    it('returns the most recent analysis (queries ordered by createdAt DESC)', async () => {
      analysisRepo.findOne.mockResolvedValue(makeAnalysis({ issues: [] }));
      preValidationRepo.findOne.mockResolvedValue(null);

      await service.getDocumentAnalysisSummary(DOC_ID, PROJECT_ID, TENANT_ID);

      expect(analysisRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });

    it('throws ResourceNotFoundException when document does not exist', async () => {
      documentsService.findById.mockRejectedValue(
        new ResourceNotFoundException('Document', DOC_ID),
      );

      await expect(
        service.getDocumentAnalysisSummary(DOC_ID, PROJECT_ID, TENANT_ID),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
