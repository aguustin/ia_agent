import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentAnalysisProcessor, AnalysisJobData } from './document-analysis.processor';
import { Analysis, AnalysisStatus } from '../entities/analysis.entity';
import { AnalysisIssue } from '../entities/analysis-issue.entity';
import { Document, DocumentStatus, DocumentType } from '@modules/documents/entities/document.entity';
import { AI_PROVIDER_TOKEN, IssueType, IssueSeverity, DocumentAnalysisResult } from '@providers/ai/ai-provider.interface';
import { FILE_STORAGE_SERVICE } from '@providers/storage/file-storage.interface';
import { StorageError, StorageFileNotFoundError } from '@providers/storage/storage.errors';
import { TextExtractorService } from '../services/text-extractor.service';
import { JOBS } from '@common/constants/queues.constant';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ANALYSIS_ID = 'analysis-aaa';
const DOC_ID = 'doc-bbb';
const PROJECT_ID = 'proj-ccc';
const TENANT_ID = 'tenant-ddd';

const JOB_DATA: AnalysisJobData = {
  analysisId: ANALYSIS_ID,
  documentId: DOC_ID,
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  projectName: 'Proyecto Test',
};

function makeJob(overrides: Partial<AnalysisJobData> = {}): Job<AnalysisJobData> {
  return {
    id: 'job-1',
    name: JOBS.ANALYZE_DOCUMENT,
    data: { ...JOB_DATA, ...overrides },
    updateProgress: jest.fn().mockResolvedValue(undefined),
  } as unknown as Job<AnalysisJobData>;
}

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
    uploadedById: 'user-1',
    tenantId: TENANT_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: null as any,
    uploadedBy: null as any,
    ...overrides,
  };
}

const AI_RESULT: DocumentAnalysisResult = {
  summary: 'El documento cumple parcialmente con la normativa CTE.',
  complianceScore: 72,
  issues: [
    {
      type: IssueType.COMPLIANCE,
      severity: IssueSeverity.HIGH,
      description: 'Falta sección de evacuación según CTE DB-SI',
      location: 'Planta baja',
      recommendation: 'Añadir plano de evacuación',
      regulation: 'CTE DB-SI',
    },
  ],
  recommendations: ['Revisar plano de evacuación'],
  metadata: { pagesAnalyzed: 10, analysisVersion: '1.0', model: 'gpt-4o' },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('DocumentAnalysisProcessor', () => {
  let processor: DocumentAnalysisProcessor;

  let analysisRepo: jest.Mocked<Record<string, jest.Mock>>;
  let documentRepo: jest.Mocked<Record<string, jest.Mock>>;
  let aiProvider: jest.Mocked<Record<string, jest.Mock>>;
  let fileStorage: jest.Mocked<Record<string, jest.Mock>>;
  let textExtractor: jest.Mocked<Record<string, jest.Mock>>;
  let dataSource: jest.Mocked<Record<string, jest.Mock>>;
  let mockEntityManager: jest.Mocked<Record<string, jest.Mock>>;

  beforeEach(async () => {
    mockEntityManager = {
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockImplementation((_entity: any, data: any) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };

    analysisRepo = {
      update: jest.fn().mockResolvedValue(undefined),
    };

    documentRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      findOneOrFail: jest.fn().mockResolvedValue(makeDocument()),
    };

    aiProvider = {
      analyzeDocument: jest.fn().mockResolvedValue(AI_RESULT),
    };

    fileStorage = {
      download: jest.fn().mockResolvedValue(Buffer.from('PDF bytes')),
    };

    textExtractor = {
      extract: jest.fn().mockResolvedValue({
        text: 'Contenido del documento...',
        pageCount: 10,
        truncated: false,
        method: 'pdf-parse',
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockEntityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentAnalysisProcessor,
        { provide: getRepositoryToken(Analysis), useValue: analysisRepo },
        { provide: getRepositoryToken(Document), useValue: documentRepo },
        { provide: AI_PROVIDER_TOKEN, useValue: aiProvider },
        { provide: FILE_STORAGE_SERVICE, useValue: fileStorage },
        { provide: TextExtractorService, useValue: textExtractor },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    processor = module.get(DocumentAnalysisProcessor);
  });

  // -------------------------------------------------------------------------
  // Success path
  // -------------------------------------------------------------------------

  describe('process — success', () => {
    it('runs the full pipeline and marks analysis COMPLETED', async () => {
      await processor.process(makeJob());

      // Status transitions
      expect(analysisRepo.update).toHaveBeenCalledWith(
        ANALYSIS_ID,
        expect.objectContaining({ status: AnalysisStatus.PROCESSING }),
      );
      expect(documentRepo.update).toHaveBeenCalledWith(
        DOC_ID,
        expect.objectContaining({ status: DocumentStatus.PROCESSING }),
      );

      // AI call
      expect(aiProvider.analyzeDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          documentContent: 'Contenido del documento...',
          documentName: 'plano.pdf',
          projectName: 'Proyecto Test',
        }),
      );

      // Final status
      expect(analysisRepo.update).toHaveBeenCalledWith(
        ANALYSIS_ID,
        expect.objectContaining({ status: AnalysisStatus.COMPLETED }),
      );
      expect(documentRepo.update).toHaveBeenCalledWith(
        DOC_ID,
        expect.objectContaining({ status: DocumentStatus.PROCESSED }),
      );
    });

    it('saves results inside a transaction', async () => {
      await processor.process(makeJob());

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        Analysis,
        ANALYSIS_ID,
        expect.objectContaining({
          summary: AI_RESULT.summary,
          complianceScore: AI_RESULT.complianceScore,
        }),
      );
    });

    it('deletes existing issues before inserting new ones (idempotent on retry)', async () => {
      await processor.process(makeJob());

      expect(mockEntityManager.delete).toHaveBeenCalledWith(AnalysisIssue, { analysisId: ANALYSIS_ID });
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        AnalysisIssue,
        expect.arrayContaining([
          expect.objectContaining({ analysisId: ANALYSIS_ID }),
        ]),
      );
    });

    it('skips issue insert when AI returns no issues', async () => {
      aiProvider.analyzeDocument.mockResolvedValue({ ...AI_RESULT, issues: [] });

      await processor.process(makeJob());

      expect(mockEntityManager.delete).toHaveBeenCalledWith(AnalysisIssue, { analysisId: ANALYSIS_ID });
      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Failure paths
  // -------------------------------------------------------------------------

  describe('process — failure', () => {
    it('marks analysis and document as FAILED when file is not found in storage', async () => {
      fileStorage.download.mockRejectedValue(new StorageFileNotFoundError('not found'));

      await expect(processor.process(makeJob())).rejects.toThrow();

      expect(analysisRepo.update).toHaveBeenCalledWith(
        ANALYSIS_ID,
        expect.objectContaining({ status: AnalysisStatus.FAILED }),
      );
      expect(documentRepo.update).toHaveBeenCalledWith(
        DOC_ID,
        expect.objectContaining({ status: DocumentStatus.ERROR }),
      );
    });

    it('marks FAILED for generic StorageError', async () => {
      fileStorage.download.mockRejectedValue(new StorageError('timeout'));

      await expect(processor.process(makeJob())).rejects.toThrow();

      expect(analysisRepo.update).toHaveBeenCalledWith(
        ANALYSIS_ID,
        expect.objectContaining({ status: AnalysisStatus.FAILED }),
      );
    });

    it('marks FAILED when AI provider throws', async () => {
      aiProvider.analyzeDocument.mockRejectedValue(new Error('OpenAI rate limit exceeded'));

      await expect(processor.process(makeJob())).rejects.toThrow('OpenAI rate limit exceeded');

      expect(analysisRepo.update).toHaveBeenCalledWith(
        ANALYSIS_ID,
        expect.objectContaining({
          status: AnalysisStatus.FAILED,
          errorMessage: 'OpenAI rate limit exceeded',
        }),
      );
    });

    it('marks FAILED when text extraction throws', async () => {
      textExtractor.extract.mockRejectedValue(new Error('Corrupt PDF'));

      await expect(processor.process(makeJob())).rejects.toThrow('Corrupt PDF');

      expect(analysisRepo.update).toHaveBeenCalledWith(
        ANALYSIS_ID,
        expect.objectContaining({ status: AnalysisStatus.FAILED }),
      );
    });

    it('marks FAILED when the transaction to save results throws', async () => {
      dataSource.transaction.mockRejectedValue(new Error('DB connection lost'));

      await expect(processor.process(makeJob())).rejects.toThrow('DB connection lost');

      expect(analysisRepo.update).toHaveBeenCalledWith(
        ANALYSIS_ID,
        expect.objectContaining({ status: AnalysisStatus.FAILED }),
      );
    });

    it('records the error message in the Analysis when failure occurs', async () => {
      const errorMsg = 'OpenAI service unavailable';
      aiProvider.analyzeDocument.mockRejectedValue(new Error(errorMsg));

      await expect(processor.process(makeJob())).rejects.toThrow();

      expect(analysisRepo.update).toHaveBeenCalledWith(
        ANALYSIS_ID,
        expect.objectContaining({ errorMessage: errorMsg }),
      );
    });
  });
});
