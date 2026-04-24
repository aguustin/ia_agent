"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DocumentAnalysisProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentAnalysisProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const queues_constant_1 = require("../../../common/constants/queues.constant");
const analysis_entity_1 = require("../entities/analysis.entity");
const analysis_issue_entity_1 = require("../entities/analysis-issue.entity");
const document_entity_1 = require("../../documents/entities/document.entity");
const ai_provider_interface_1 = require("../../../providers/ai/ai-provider.interface");
const file_storage_interface_1 = require("../../../providers/storage/file-storage.interface");
const storage_errors_1 = require("../../../providers/storage/storage.errors");
const text_extractor_service_1 = require("../services/text-extractor.service");
let DocumentAnalysisProcessor = DocumentAnalysisProcessor_1 = class DocumentAnalysisProcessor extends bullmq_1.WorkerHost {
    constructor(analysisRepo, documentRepo, ai, fileStorage, textExtractor, dataSource) {
        super();
        this.analysisRepo = analysisRepo;
        this.documentRepo = documentRepo;
        this.ai = ai;
        this.fileStorage = fileStorage;
        this.textExtractor = textExtractor;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(DocumentAnalysisProcessor_1.name);
    }
    async process(job) {
        const { analysisId, documentId, projectName, projectDescription } = job.data;
        this.logger.log(`Starting analysis ${analysisId} for document ${documentId}`);
        await this.analysisRepo.update(analysisId, {
            status: analysis_entity_1.AnalysisStatus.PROCESSING,
            startedAt: new Date(),
        });
        await this.documentRepo.update(documentId, { status: document_entity_1.DocumentStatus.PROCESSING });
        try {
            const document = await this.documentRepo.findOneOrFail({ where: { id: documentId } });
            let fileBuffer;
            try {
                fileBuffer = await this.fileStorage.download(document.fileKey);
            }
            catch (error) {
                if (error instanceof storage_errors_1.StorageFileNotFoundError) {
                    throw new Error(`Document file '${document.fileKey}' not found in storage. ` +
                        'It may have been deleted externally.');
                }
                if (error instanceof storage_errors_1.StorageError) {
                    throw new Error(`Failed to retrieve document from storage: ${error.message}`);
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
                    status: analysis_entity_1.AnalysisStatus.COMPLETED,
                    completedAt: new Date(),
                }),
                this.documentRepo.update(documentId, { status: document_entity_1.DocumentStatus.PROCESSED }),
            ]);
            await job.updateProgress(100);
            this.logger.log(`Analysis ${analysisId} completed — score: ${result.complianceScore}, issues: ${result.issues.length}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Analysis ${analysisId} failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            await Promise.all([
                this.analysisRepo.update(analysisId, {
                    status: analysis_entity_1.AnalysisStatus.FAILED,
                    errorMessage,
                    completedAt: new Date(),
                }),
                this.documentRepo.update(documentId, { status: document_entity_1.DocumentStatus.ERROR }),
            ]);
            throw error;
        }
    }
    async saveResults(analysisId, result) {
        await this.dataSource.transaction(async (em) => {
            await em.update(analysis_entity_1.Analysis, analysisId, {
                summary: result.summary,
                complianceScore: result.complianceScore,
                recommendations: result.recommendations,
                metadata: result.metadata,
            });
            await em.delete(analysis_issue_entity_1.AnalysisIssue, { analysisId });
            if (result.issues.length > 0) {
                const issues = result.issues.map((issue) => em.create(analysis_issue_entity_1.AnalysisIssue, {
                    ...issue,
                    location: issue.location ?? null,
                    recommendation: issue.recommendation ?? null,
                    regulation: issue.regulation ?? null,
                    analysisId,
                }));
                await em.save(analysis_issue_entity_1.AnalysisIssue, issues);
            }
        });
    }
};
exports.DocumentAnalysisProcessor = DocumentAnalysisProcessor;
exports.DocumentAnalysisProcessor = DocumentAnalysisProcessor = DocumentAnalysisProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queues_constant_1.QUEUES.ANALYSIS, {
        concurrency: parseInt(process.env.ANALYSIS_QUEUE_CONCURRENCY ?? '5', 10),
    }),
    __param(0, (0, typeorm_1.InjectRepository)(analysis_entity_1.Analysis)),
    __param(1, (0, typeorm_1.InjectRepository)(document_entity_1.Document)),
    __param(2, (0, common_1.Inject)(ai_provider_interface_1.AI_PROVIDER_TOKEN)),
    __param(3, (0, common_1.Inject)(file_storage_interface_1.FILE_STORAGE_SERVICE)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, Object, Object, text_extractor_service_1.TextExtractorService,
        typeorm_2.DataSource])
], DocumentAnalysisProcessor);
//# sourceMappingURL=document-analysis.processor.js.map