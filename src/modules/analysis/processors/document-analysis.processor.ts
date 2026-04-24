import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Job } from 'bullmq';
import { QUEUES } from '@common/constants/queues.constant';
import { Analysis, AnalysisStatus } from '../entities/analysis.entity';
import { AnalysisIssue } from '../entities/analysis-issue.entity';
import { Document, DocumentStatus } from '@modules/documents/entities/document.entity';
import {
  IAIProvider,
  AI_PROVIDER_TOKEN,
  DocumentAnalysisResult,
} from '@providers/ai/ai-provider.interface';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '@providers/storage/file-storage.interface';
import { StorageError, StorageFileNotFoundError } from '@providers/storage/storage.errors';
import { TextExtractorService } from '../services/text-extractor.service';

export interface AnalysisJobData {
  analysisId: string;
  documentId: string;
  projectId: string;
  tenantId: string;
  projectName: string;
  projectDescription?: string;
}

@Processor(QUEUES.ANALYSIS, {
  concurrency: parseInt(process.env.ANALYSIS_QUEUE_CONCURRENCY ?? '5', 10),
})
export class DocumentAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentAnalysisProcessor.name);

  constructor(
    @InjectRepository(Analysis)
    private readonly analysisRepo: Repository<Analysis>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @Inject(AI_PROVIDER_TOKEN)
    private readonly ai: IAIProvider,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly fileStorage: FileStorageService,
    private readonly textExtractor: TextExtractorService,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async process(job: Job<AnalysisJobData>): Promise<void> {
    const { analysisId, documentId, projectName, projectDescription } = job.data;

    this.logger.log(`Starting analysis ${analysisId} for document ${documentId}`);

    await this.analysisRepo.update(analysisId, {
      status: AnalysisStatus.PROCESSING,
      startedAt: new Date(),
    });
    await this.documentRepo.update(documentId, { status: DocumentStatus.PROCESSING });

    try {
      const document = await this.documentRepo.findOneOrFail({ where: { id: documentId } });

      let fileBuffer: Buffer;
      try {
        fileBuffer = await this.fileStorage.download(document.fileKey);
      } catch (error) {
        if (error instanceof StorageFileNotFoundError) {
          throw new Error(
            `Document file '${document.fileKey}' not found in storage. ` +
              'It may have been deleted externally.',
          );
        }
        if (error instanceof StorageError) {
          throw new Error(`Failed to retrieve document from storage: ${(error as Error).message}`);
        }
        throw error;
      }

      await job.updateProgress(20);

      const extraction = await this.textExtractor.extract(fileBuffer, document.mimeType);
      await job.updateProgress(40);

      const result = await this.ai.analyzeDocument({
        documentContent: extraction.text,
        documentName: document.originalName,
        documentType: document.documentType,
        projectName,
        projectDescription,
      });

      await job.updateProgress(80);
      await this.saveResults(analysisId, result);
      await job.updateProgress(90);

      await Promise.all([
        this.analysisRepo.update(analysisId, {
          status: AnalysisStatus.COMPLETED,
          completedAt: new Date(),
        }),
        this.documentRepo.update(documentId, { status: DocumentStatus.PROCESSED }),
      ]);

      await job.updateProgress(100);
      this.logger.log(
        `Analysis ${analysisId} completed — score: ${result.complianceScore}, issues: ${result.issues.length}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Analysis ${analysisId} failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      await Promise.all([
        this.analysisRepo.update(analysisId, {
          status: AnalysisStatus.FAILED,
          errorMessage,
          completedAt: new Date(),
        }),
        this.documentRepo.update(documentId, { status: DocumentStatus.ERROR }),
      ]);

      throw error;
    }
  }

  private async saveResults(analysisId: string, result: DocumentAnalysisResult): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      await em.update(Analysis, analysisId, {
        summary: result.summary,
        complianceScore: result.complianceScore,
        recommendations: result.recommendations,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: result.metadata as any,
      });

      // Delete before insert so BullMQ retries don't produce duplicates.
      await em.delete(AnalysisIssue, { analysisId });

      if (result.issues.length > 0) {
        const issues = result.issues.map((issue) =>
          em.create(AnalysisIssue, {
            ...issue,
            location: issue.location ?? null,
            recommendation: issue.recommendation ?? null,
            regulation: issue.regulation ?? null,
            analysisId,
          }),
        );
        await em.save(AnalysisIssue, issues);
      }
    });
  }
}
