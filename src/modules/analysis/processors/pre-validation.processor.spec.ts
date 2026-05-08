import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job, UnrecoverableError } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PreValidationProcessor, PreValidationJobData } from './pre-validation.processor';
import { PreValidationRecord, PreValidationStatus } from '../entities/pre-validation-record.entity';
import { DocumentPreValidationService } from '../services/document-pre-validation.service';
import { ResourceNotFoundException } from '@common/exceptions/domain.exception';
import {
  PreValidationFileError,
  PreValidationInvalidResponseError,
  PreValidationAIError,
} from '../errors/pre-validation.errors';
import { JOBS } from '@common/constants/queues.constant';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RECORD_ID = 'record-aaa';
const DOC_ID = 'doc-bbb';
const TENANT_ID = 'tenant-ccc';

const JOB_DATA: PreValidationJobData = {
  recordId: RECORD_ID,
  documentId: DOC_ID,
  tenantId: TENANT_ID,
};

const PRE_VALIDATION_RESULT = {
  faltantes: ['Memoria descriptiva', 'Plano de situación'],
  errores: ['Firma del arquitecto no encontrada'],
  advertencias: ['Escala no indicada en plano de planta'],
};

function makeJob(
  data: Partial<PreValidationJobData> = {},
  name: string = JOBS.PRE_VALIDATE_DOCUMENT,
): Job<PreValidationJobData> {
  return {
    id: 'job-1',
    name: name as any,
    data: { ...JOB_DATA, ...data },
    updateProgress: jest.fn().mockResolvedValue(undefined),
  } as unknown as Job<PreValidationJobData>;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PreValidationProcessor', () => {
  let processor: PreValidationProcessor;

  let recordRepo: jest.Mocked<Record<string, jest.Mock>>;
  let preValidationService: jest.Mocked<Record<string, jest.Mock>>;

  beforeEach(async () => {
    recordRepo = {
      update: jest.fn().mockResolvedValue(undefined),
    };

    preValidationService = {
      analyzeDocument: jest.fn().mockResolvedValue(PRE_VALIDATION_RESULT),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreValidationProcessor,
        { provide: getRepositoryToken(PreValidationRecord), useValue: recordRepo },
        { provide: DocumentPreValidationService, useValue: preValidationService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    processor = module.get(PreValidationProcessor);
  });

  // -------------------------------------------------------------------------
  // Success path
  // -------------------------------------------------------------------------

  describe('process — success', () => {
    it('transitions record to PROCESSING then COMPLETED with results', async () => {
      await processor.process(makeJob());

      expect(recordRepo.update).toHaveBeenCalledWith(
        RECORD_ID,
        expect.objectContaining({ status: PreValidationStatus.PROCESSING }),
      );
      expect(preValidationService.analyzeDocument).toHaveBeenCalledWith(DOC_ID, TENANT_ID);
      expect(recordRepo.update).toHaveBeenCalledWith(
        RECORD_ID,
        expect.objectContaining({
          status: PreValidationStatus.COMPLETED,
          faltantes: PRE_VALIDATION_RESULT.faltantes,
          errores: PRE_VALIDATION_RESULT.errores,
          advertencias: PRE_VALIDATION_RESULT.advertencias,
        }),
      );
    });

    it('stores an empty arrays result when the document has no issues', async () => {
      preValidationService.analyzeDocument.mockResolvedValue({
        faltantes: [],
        errores: [],
        advertencias: [],
      });

      await processor.process(makeJob());

      expect(recordRepo.update).toHaveBeenCalledWith(
        RECORD_ID,
        expect.objectContaining({
          status: PreValidationStatus.COMPLETED,
          faltantes: [],
          errores: [],
          advertencias: [],
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Unknown job name — ignored
  // -------------------------------------------------------------------------

  describe('process — unknown job name', () => {
    it('does nothing and returns without processing when the job name is not recognized', async () => {
      await processor.process(makeJob({}, 'unknown-job-name'));

      expect(recordRepo.update).not.toHaveBeenCalled();
      expect(preValidationService.analyzeDocument).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Non-retryable failures → UnrecoverableError
  // -------------------------------------------------------------------------

  describe('process — non-retryable errors', () => {
    async function expectUnrecoverable(error: Error): Promise<void> {
      preValidationService.analyzeDocument.mockRejectedValue(error);

      await expect(processor.process(makeJob())).rejects.toThrow(UnrecoverableError);
      expect(recordRepo.update).toHaveBeenCalledWith(
        RECORD_ID,
        expect.objectContaining({ status: PreValidationStatus.FAILED }),
      );
    }

    it('throws UnrecoverableError and marks FAILED when document does not exist', async () => {
      await expectUnrecoverable(new ResourceNotFoundException('Document', DOC_ID));
    });

    it('throws UnrecoverableError and marks FAILED when file is missing from storage', async () => {
      await expectUnrecoverable(new PreValidationFileError(DOC_ID));
    });

    it('throws UnrecoverableError and marks FAILED when AI returns invalid JSON structure', async () => {
      await expectUnrecoverable(new PreValidationInvalidResponseError('missing faltantes array'));
    });
  });

  // -------------------------------------------------------------------------
  // Retryable failures → rethrow as-is
  // -------------------------------------------------------------------------

  describe('process — retryable errors', () => {
    it('marks FAILED and rethrows original error for AI network timeout (allows BullMQ backoff)', async () => {
      const aiError = new PreValidationAIError(new Error('OpenAI timeout'));
      preValidationService.analyzeDocument.mockRejectedValue(aiError);

      await expect(processor.process(makeJob())).rejects.toThrow(PreValidationAIError);
      // Must NOT be wrapped in UnrecoverableError so BullMQ will retry
      await expect(processor.process(makeJob())).rejects.not.toThrow(UnrecoverableError);

      expect(recordRepo.update).toHaveBeenCalledWith(
        RECORD_ID,
        expect.objectContaining({ status: PreValidationStatus.FAILED }),
      );
    });

    it('marks FAILED and rethrows for generic unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected DB failure');
      preValidationService.analyzeDocument.mockRejectedValue(unexpectedError);

      await expect(processor.process(makeJob())).rejects.toThrow('Unexpected DB failure');
      await expect(processor.process(makeJob())).rejects.not.toThrow(UnrecoverableError);
    });
  });

  // -------------------------------------------------------------------------
  // Error message stored in record
  // -------------------------------------------------------------------------

  describe('error message persistence', () => {
    it('stores the error message in the PreValidationRecord on failure', async () => {
      const errorMsg = 'Documento no encontrado en base de datos';
      preValidationService.analyzeDocument.mockRejectedValue(
        new ResourceNotFoundException('Document', DOC_ID),
      );

      await expect(processor.process(makeJob())).rejects.toThrow(UnrecoverableError);

      expect(recordRepo.update).toHaveBeenCalledWith(
        RECORD_ID,
        expect.objectContaining({
          status: PreValidationStatus.FAILED,
          errorMessage: expect.any(String),
        }),
      );
    });
  });
});
