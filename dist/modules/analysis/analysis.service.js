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
var AnalysisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const analysis_entity_1 = require("./entities/analysis.entity");
const pre_validation_record_entity_1 = require("./entities/pre-validation-record.entity");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const domain_exception_1 = require("../../common/exceptions/domain.exception");
const documents_service_1 = require("../documents/documents.service");
const projects_service_1 = require("../projects/projects.service");
const document_entity_1 = require("../documents/entities/document.entity");
const queues_constant_1 = require("../../common/constants/queues.constant");
const ai_provider_interface_1 = require("../../providers/ai/ai-provider.interface");
const SEVERITY_ORDER = {
    [ai_provider_interface_1.IssueSeverity.CRITICAL]: 0,
    [ai_provider_interface_1.IssueSeverity.HIGH]: 1,
    [ai_provider_interface_1.IssueSeverity.MEDIUM]: 2,
    [ai_provider_interface_1.IssueSeverity.LOW]: 3,
    [ai_provider_interface_1.IssueSeverity.INFO]: 4,
};
let AnalysisService = AnalysisService_1 = class AnalysisService {
    constructor(analysisRepo, preValidationRepo, analysisQueue, preValidationQueue, documentsService, projectsService) {
        this.analysisRepo = analysisRepo;
        this.preValidationRepo = preValidationRepo;
        this.analysisQueue = analysisQueue;
        this.preValidationQueue = preValidationQueue;
        this.documentsService = documentsService;
        this.projectsService = projectsService;
        this.logger = new common_1.Logger(AnalysisService_1.name);
    }
    async triggerAnalysis(documentId, projectId, actor) {
        const document = await this.documentsService.findById(documentId, projectId, actor.tenantId);
        if (document.status === document_entity_1.DocumentStatus.PENDING_UPLOAD) {
            throw new domain_exception_1.UnprocessableEntityException('Document has not been uploaded yet. Complete the upload before triggering analysis.');
        }
        if (document.status === document_entity_1.DocumentStatus.PROCESSING) {
            throw new domain_exception_1.ConflictException('Document is already being analyzed');
        }
        const existingActive = await this.analysisRepo.findOne({
            where: [
                { documentId, status: analysis_entity_1.AnalysisStatus.QUEUED },
                { documentId, status: analysis_entity_1.AnalysisStatus.PROCESSING },
            ],
        });
        if (existingActive) {
            throw new domain_exception_1.ConflictException('An analysis for this document is already active');
        }
        const project = await this.projectsService.findById(projectId, actor.tenantId);
        const analysis = this.analysisRepo.create({
            documentId,
            projectId,
            tenantId: actor.tenantId,
            status: analysis_entity_1.AnalysisStatus.QUEUED,
        });
        const saved = await this.analysisRepo.save(analysis);
        const jobData = {
            analysisId: saved.id,
            documentId,
            projectId,
            tenantId: actor.tenantId,
            projectName: project.name,
            projectDescription: project.description ?? undefined,
        };
        try {
            const job = await this.analysisQueue.add(queues_constant_1.JOBS.ANALYZE_DOCUMENT, jobData, {
                attempts: parseInt(process.env.ANALYSIS_JOB_ATTEMPTS ?? '3', 10),
                backoff: {
                    type: 'exponential',
                    delay: parseInt(process.env.ANALYSIS_JOB_BACKOFF_DELAY ?? '5000', 10),
                },
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 50 },
            });
            this.logger.log(`Analysis job ${job.id} queued for document ${documentId}`);
        }
        catch (queueError) {
            this.logger.error(`Failed to enqueue analysis for document ${documentId}: ${queueError}`);
            await this.analysisRepo.update(saved.id, {
                status: analysis_entity_1.AnalysisStatus.FAILED,
                errorMessage: 'Failed to enqueue analysis job',
                completedAt: new Date(),
            });
            throw queueError;
        }
        return saved;
    }
    async findByDocument(documentId, projectId, tenantId, pagination) {
        await this.documentsService.findById(documentId, projectId, tenantId);
        const [data, total] = await this.analysisRepo.findAndCount({
            where: { documentId, tenantId },
            relations: ['issues'],
            order: { createdAt: 'DESC' },
            skip: pagination.skip,
            take: pagination.limit,
        });
        return (0, pagination_dto_1.paginate)(data, total, pagination);
    }
    async findById(id, tenantId) {
        const analysis = await this.analysisRepo.findOne({
            where: { id, tenantId },
            relations: ['issues', 'document'],
        });
        if (!analysis)
            throw new domain_exception_1.ResourceNotFoundException('Analysis', id);
        return analysis;
    }
    async getDocumentAnalysisSummary(documentId, projectId, tenantId) {
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
    mapCompliance(analysis) {
        const issues = [...(analysis.issues ?? [])]
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
    mapPreValidation(record) {
        return {
            recordId: record.id,
            status: record.status,
            faltantes: record.faltantes ?? [],
            errores: record.errores ?? [],
            advertencias: record.advertencias ?? [],
            completedAt: record.completedAt,
        };
    }
    async findByProject(projectId, tenantId, pagination) {
        await this.projectsService.findById(projectId, tenantId);
        const [data, total] = await this.analysisRepo.findAndCount({
            where: { projectId, tenantId },
            relations: ['document', 'issues'],
            order: { createdAt: 'DESC' },
            skip: pagination.skip,
            take: pagination.limit,
        });
        return (0, pagination_dto_1.paginate)(data, total, pagination);
    }
    async getProjectAnalysisSummary(projectId, tenantId) {
        const result = await this.analysisRepo
            .createQueryBuilder('analysis')
            .leftJoin('analysis.issues', 'issue')
            .where('analysis.projectId = :projectId', { projectId })
            .andWhere('analysis.tenantId = :tenantId', { tenantId })
            .select('COUNT(DISTINCT analysis.id)', 'totalAnalyses')
            .addSelect(`COUNT(DISTINCT CASE WHEN analysis.status = 'completed' THEN analysis.id END)`, 'completed')
            .addSelect('AVG(analysis.complianceScore)', 'avgComplianceScore')
            .addSelect(`COUNT(CASE WHEN issue.severity = 'critical' THEN 1 END)`, 'criticalIssues')
            .getRawOne();
        return {
            totalAnalyses: parseInt(result?.totalAnalyses ?? '0', 10),
            completed: parseInt(result?.completed ?? '0', 10),
            avgComplianceScore: result?.avgComplianceScore
                ? parseFloat(result.avgComplianceScore)
                : null,
            criticalIssues: parseInt(result?.criticalIssues ?? '0', 10),
        };
    }
    async triggerPreValidation(documentId, projectId, actor) {
        const document = await this.documentsService.findById(documentId, projectId, actor.tenantId);
        if (document.status === document_entity_1.DocumentStatus.PENDING_UPLOAD) {
            throw new domain_exception_1.UnprocessableEntityException('Document has not been uploaded yet. Complete the upload before triggering pre-validation.');
        }
        const existingActive = await this.preValidationRepo.findOne({
            where: [
                { documentId, status: pre_validation_record_entity_1.PreValidationStatus.QUEUED },
                { documentId, status: pre_validation_record_entity_1.PreValidationStatus.PROCESSING },
            ],
        });
        if (existingActive) {
            throw new domain_exception_1.ConflictException('A pre-validation for this document is already active.');
        }
        const record = this.preValidationRepo.create({
            documentId,
            projectId,
            tenantId: actor.tenantId,
            status: pre_validation_record_entity_1.PreValidationStatus.QUEUED,
        });
        const saved = await this.preValidationRepo.save(record);
        const jobData = {
            recordId: saved.id,
            documentId,
            tenantId: actor.tenantId,
        };
        try {
            const job = await this.preValidationQueue.add(queues_constant_1.JOBS.PRE_VALIDATE_DOCUMENT, jobData, {
                attempts: parseInt(process.env.PRE_VALIDATION_JOB_ATTEMPTS ?? '3', 10),
                backoff: {
                    type: 'exponential',
                    delay: parseInt(process.env.PRE_VALIDATION_JOB_BACKOFF_DELAY ?? '3000', 10),
                },
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 50 },
            });
            this.logger.log(`Pre-validation job ${job.id} queued — record: ${saved.id}, document: ${documentId}`);
        }
        catch (queueError) {
            this.logger.error(`Failed to enqueue pre-validation for document ${documentId}: ${queueError}`);
            await this.preValidationRepo.update(saved.id, {
                status: pre_validation_record_entity_1.PreValidationStatus.FAILED,
                errorMessage: 'Failed to enqueue pre-validation job',
                completedAt: new Date(),
            });
            throw queueError;
        }
        return saved;
    }
    async findPreValidationsByDocument(documentId, projectId, tenantId, pagination) {
        await this.documentsService.findById(documentId, projectId, tenantId);
        const [data, total] = await this.preValidationRepo.findAndCount({
            where: { documentId, tenantId },
            order: { createdAt: 'DESC' },
            skip: pagination.skip,
            take: pagination.limit,
        });
        return (0, pagination_dto_1.paginate)(data, total, pagination);
    }
    async findPreValidationById(id, tenantId) {
        const record = await this.preValidationRepo.findOne({ where: { id, tenantId } });
        if (!record)
            throw new domain_exception_1.ResourceNotFoundException('PreValidationRecord', id);
        return record;
    }
};
exports.AnalysisService = AnalysisService;
exports.AnalysisService = AnalysisService = AnalysisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(analysis_entity_1.Analysis)),
    __param(1, (0, typeorm_1.InjectRepository)(pre_validation_record_entity_1.PreValidationRecord)),
    __param(2, (0, bullmq_1.InjectQueue)(queues_constant_1.QUEUES.ANALYSIS)),
    __param(3, (0, bullmq_1.InjectQueue)(queues_constant_1.QUEUES.PRE_VALIDATION)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        bullmq_2.Queue,
        bullmq_2.Queue,
        documents_service_1.DocumentsService,
        projects_service_1.ProjectsService])
], AnalysisService);
//# sourceMappingURL=analysis.service.js.map