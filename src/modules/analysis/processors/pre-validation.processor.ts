import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Job, UnrecoverableError } from 'bullmq';
import { QUEUES, JOBS } from '@common/constants/queues.constant';
import { ResourceNotFoundException } from '@common/exceptions/domain.exception';
import { DocumentPreValidationService } from '../services/document-pre-validation.service';
import {
  PreValidationFileError,
  PreValidationInvalidResponseError,
  PreValidationTextExtractionError,
} from '../errors/pre-validation.errors';
import {
  PreValidationRecord,
  PreValidationStatus,
} from '../entities/pre-validation-record.entity';

export interface PreValidationJobData {
  /** ID of the PreValidationRecord to update throughout the lifecycle. */
  recordId: string;
  documentId: string;
  tenantId: string;
}

@Processor(QUEUES.PRE_VALIDATION, {
  concurrency: parseInt(process.env.PRE_VALIDATION_CONCURRENCY ?? '3', 10),
})
export class PreValidationProcessor extends WorkerHost {
  private readonly logger = new Logger(PreValidationProcessor.name);

  constructor(
    @InjectRepository(PreValidationRecord)
    private readonly recordRepo: Repository<PreValidationRecord>,
    private readonly preValidationService: DocumentPreValidationService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<PreValidationJobData>): Promise<void> {
    if (job.name !== JOBS.PRE_VALIDATE_DOCUMENT) return;

    const { recordId, documentId, tenantId } = job.data;

    this.logger.log(
      `Pre-validation job ${job.id} started — record: ${recordId}, document: ${documentId}`,
    );

    await this.recordRepo.update(recordId, {
      status: PreValidationStatus.PROCESSING,
      startedAt: new Date(),
    });

    try {
      const result = await this.preValidationService.analyzeDocument(documentId, tenantId);

      await this.recordRepo.update(recordId, {
        status: PreValidationStatus.COMPLETED,
        faltantes: result.faltantes,
        errores: result.errores,
        advertencias: result.advertencias,
        errorMessage: null,
        completedAt: new Date(),
      });

      this.logger.log(
        `Pre-validation job ${job.id} completed — ` +
          `faltantes: ${result.faltantes.length}, ` +
          `errores: ${result.errores.length}, ` +
          `advertencias: ${result.advertencias.length}`,
      );
      this.eventEmitter.emit('analysis.done', {
        documentId,
        type: 'pre-validation',
        status: 'completed',
        recordId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Pre-validation job ${job.id} failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.recordRepo.update(recordId, {
        status: PreValidationStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });

      this.eventEmitter.emit('analysis.done', {
        documentId,
        type: 'pre-validation',
        status: 'failed',
        recordId,
        errorMessage,
      });

      // Non-retryable: retrying won't help — fail permanently so BullMQ stops.
      if (
        error instanceof ResourceNotFoundException ||
        error instanceof PreValidationFileError ||
        error instanceof PreValidationTextExtractionError ||
        error instanceof PreValidationInvalidResponseError
      ) {
        throw new UnrecoverableError(errorMessage);
      }

      throw error;
    }
  }
}
