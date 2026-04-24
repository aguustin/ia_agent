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
var PreValidationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreValidationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bullmq_2 = require("bullmq");
const queues_constant_1 = require("../../../common/constants/queues.constant");
const domain_exception_1 = require("../../../common/exceptions/domain.exception");
const document_pre_validation_service_1 = require("../services/document-pre-validation.service");
const pre_validation_errors_1 = require("../errors/pre-validation.errors");
const pre_validation_record_entity_1 = require("../entities/pre-validation-record.entity");
let PreValidationProcessor = PreValidationProcessor_1 = class PreValidationProcessor extends bullmq_1.WorkerHost {
    constructor(recordRepo, preValidationService) {
        super();
        this.recordRepo = recordRepo;
        this.preValidationService = preValidationService;
        this.logger = new common_1.Logger(PreValidationProcessor_1.name);
    }
    async process(job) {
        if (job.name !== queues_constant_1.JOBS.PRE_VALIDATE_DOCUMENT)
            return;
        const { recordId, documentId, tenantId } = job.data;
        this.logger.log(`Pre-validation job ${job.id} started — record: ${recordId}, document: ${documentId}`);
        await this.recordRepo.update(recordId, {
            status: pre_validation_record_entity_1.PreValidationStatus.PROCESSING,
            startedAt: new Date(),
        });
        try {
            const result = await this.preValidationService.analyzeDocument(documentId, tenantId);
            await this.recordRepo.update(recordId, {
                status: pre_validation_record_entity_1.PreValidationStatus.COMPLETED,
                faltantes: result.faltantes,
                errores: result.errores,
                advertencias: result.advertencias,
                errorMessage: null,
                completedAt: new Date(),
            });
            this.logger.log(`Pre-validation job ${job.id} completed — ` +
                `faltantes: ${result.faltantes.length}, ` +
                `errores: ${result.errores.length}, ` +
                `advertencias: ${result.advertencias.length}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Pre-validation job ${job.id} failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            await this.recordRepo.update(recordId, {
                status: pre_validation_record_entity_1.PreValidationStatus.FAILED,
                errorMessage,
                completedAt: new Date(),
            });
            if (error instanceof domain_exception_1.ResourceNotFoundException ||
                error instanceof pre_validation_errors_1.PreValidationFileError ||
                error instanceof pre_validation_errors_1.PreValidationInvalidResponseError) {
                throw new bullmq_2.UnrecoverableError(errorMessage);
            }
            throw error;
        }
    }
};
exports.PreValidationProcessor = PreValidationProcessor;
exports.PreValidationProcessor = PreValidationProcessor = PreValidationProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queues_constant_1.QUEUES.PRE_VALIDATION, {
        concurrency: parseInt(process.env.PRE_VALIDATION_CONCURRENCY ?? '3', 10),
    }),
    __param(0, (0, typeorm_1.InjectRepository)(pre_validation_record_entity_1.PreValidationRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        document_pre_validation_service_1.DocumentPreValidationService])
], PreValidationProcessor);
//# sourceMappingURL=pre-validation.processor.js.map