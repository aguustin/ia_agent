"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const analysis_entity_1 = require("./entities/analysis.entity");
const analysis_issue_entity_1 = require("./entities/analysis-issue.entity");
const pre_validation_record_entity_1 = require("./entities/pre-validation-record.entity");
const analysis_service_1 = require("./analysis.service");
const analysis_controller_1 = require("./analysis.controller");
const document_analysis_processor_1 = require("./processors/document-analysis.processor");
const pre_validation_processor_1 = require("./processors/pre-validation.processor");
const text_extractor_service_1 = require("./services/text-extractor.service");
const document_pre_validation_service_1 = require("./services/document-pre-validation.service");
const documents_module_1 = require("../documents/documents.module");
const projects_module_1 = require("../projects/projects.module");
const document_entity_1 = require("../documents/entities/document.entity");
const queues_constant_1 = require("../../common/constants/queues.constant");
let AnalysisModule = class AnalysisModule {
};
exports.AnalysisModule = AnalysisModule;
exports.AnalysisModule = AnalysisModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([analysis_entity_1.Analysis, analysis_issue_entity_1.AnalysisIssue, pre_validation_record_entity_1.PreValidationRecord, document_entity_1.Document]),
            bullmq_1.BullModule.registerQueue({ name: queues_constant_1.QUEUES.ANALYSIS }, { name: queues_constant_1.QUEUES.PRE_VALIDATION }),
            documents_module_1.DocumentsModule,
            projects_module_1.ProjectsModule,
        ],
        providers: [
            analysis_service_1.AnalysisService,
            text_extractor_service_1.TextExtractorService,
            document_pre_validation_service_1.DocumentPreValidationService,
            document_analysis_processor_1.DocumentAnalysisProcessor,
            pre_validation_processor_1.PreValidationProcessor,
        ],
        controllers: [analysis_controller_1.AnalysisController],
        exports: [analysis_service_1.AnalysisService, document_pre_validation_service_1.DocumentPreValidationService, text_extractor_service_1.TextExtractorService],
    })
], AnalysisModule);
//# sourceMappingURL=analysis.module.js.map