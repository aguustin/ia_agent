import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Analysis } from './entities/analysis.entity';
import { AnalysisIssue } from './entities/analysis-issue.entity';
import { PreValidationRecord } from './entities/pre-validation-record.entity';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { DocumentAnalysisProcessor } from './processors/document-analysis.processor';
import { PreValidationProcessor } from './processors/pre-validation.processor';
import { TextExtractorService } from './services/text-extractor.service';
import { DocumentPreValidationService } from './services/document-pre-validation.service';
import { DocumentsModule } from '@modules/documents/documents.module';
import { ProjectsModule } from '@modules/projects/projects.module';
import { Document } from '@modules/documents/entities/document.entity';
import { QUEUES } from '@common/constants/queues.constant';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analysis, AnalysisIssue, PreValidationRecord, Document]),
    BullModule.registerQueue(
      { name: QUEUES.ANALYSIS },
      { name: QUEUES.PRE_VALIDATION },
    ),
    EventEmitterModule,
    DocumentsModule,
    ProjectsModule,
  ],
  providers: [
    // Services
    AnalysisService,
    TextExtractorService,
    DocumentPreValidationService,
    // Workers
    DocumentAnalysisProcessor,
    PreValidationProcessor,
  ],
  controllers: [AnalysisController],
  exports: [AnalysisService, DocumentPreValidationService, TextExtractorService],
})
export class AnalysisModule {}
