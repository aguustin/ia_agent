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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const analysis_service_1 = require("./analysis.service");
const document_analysis_summary_dto_1 = require("./dto/document-analysis-summary.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
let AnalysisController = class AnalysisController {
    constructor(analysisService) {
        this.analysisService = analysisService;
    }
    triggerAnalysis(projectId, documentId, user) {
        return this.analysisService.triggerAnalysis(documentId, projectId, user);
    }
    getDocumentAnalysisSummary(projectId, documentId, user) {
        return this.analysisService.getDocumentAnalysisSummary(documentId, projectId, user.tenantId);
    }
    findByDocument(projectId, documentId, pagination, user) {
        return this.analysisService.findByDocument(documentId, projectId, user.tenantId, pagination);
    }
    findByProject(projectId, pagination, user) {
        return this.analysisService.findByProject(projectId, user.tenantId, pagination);
    }
    getProjectSummary(projectId, user) {
        return this.analysisService.getProjectAnalysisSummary(projectId, user.tenantId);
    }
    findOne(analysisId, user) {
        return this.analysisService.findById(analysisId, user.tenantId);
    }
    triggerPreValidation(projectId, documentId, user) {
        return this.analysisService.triggerPreValidation(documentId, projectId, user);
    }
    findPreValidationsByDocument(projectId, documentId, pagination, user) {
        return this.analysisService.findPreValidationsByDocument(documentId, projectId, user.tenantId, pagination);
    }
    findPreValidationById(recordId, user) {
        return this.analysisService.findPreValidationById(recordId, user.tenantId);
    }
};
exports.AnalysisController = AnalysisController;
__decorate([
    (0, common_1.Post)('documents/:documentId/analyses'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, swagger_1.ApiOperation)({ summary: 'Trigger full AI compliance analysis for a document' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.ACCEPTED, type: require("./entities/analysis.entity").Analysis }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "triggerAnalysis", null);
__decorate([
    (0, common_1.Get)('documents/:documentId/analysis'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get latest analysis summary for a document',
        description: 'Returns the most recent compliance analysis (with issues sorted by severity) and the ' +
            'most recent pre-validation record in a single call. ' +
            'Both fields are null when no job has run yet for that type.',
    }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: document_analysis_summary_dto_1.DocumentAnalysisSummaryDto }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Document not found.' }),
    openapi.ApiResponse({ status: 200, type: require("./dto/document-analysis-summary.dto").DocumentAnalysisSummaryDto }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "getDocumentAnalysisSummary", null);
__decorate([
    (0, common_1.Get)('documents/:documentId/analyses'),
    (0, swagger_1.ApiOperation)({ summary: 'List analyses for a specific document' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pagination_dto_1.PaginationDto, Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "findByDocument", null);
__decorate([
    (0, common_1.Get)('analyses'),
    (0, swagger_1.ApiOperation)({ summary: 'List all analyses for a project' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto, Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "findByProject", null);
__decorate([
    (0, common_1.Get)('analyses/summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get compliance summary for a project' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "getProjectSummary", null);
__decorate([
    (0, common_1.Get)('analyses/:analysisId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get analysis detail with all issues' }),
    openapi.ApiResponse({ status: 200, type: require("./entities/analysis.entity").Analysis }),
    __param(0, (0, common_1.Param)('analysisId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('documents/:documentId/pre-validation'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, swagger_1.ApiOperation)({
        summary: 'Trigger pre-validation for a document',
        description: 'Enqueues a pre-validation job. Poll the returned record ID to check status and retrieve results (faltantes, errores, advertencias).',
    }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.ACCEPTED, description: 'Job enqueued — poll for results.' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CONFLICT, description: 'A pre-validation is already queued.' }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNPROCESSABLE_ENTITY,
        description: 'Document not yet uploaded.',
    }),
    openapi.ApiResponse({ status: common_1.HttpStatus.ACCEPTED, type: require("./entities/pre-validation-record.entity").PreValidationRecord }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "triggerPreValidation", null);
__decorate([
    (0, common_1.Get)('documents/:documentId/pre-validation'),
    (0, swagger_1.ApiOperation)({ summary: 'List pre-validation records for a document' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pagination_dto_1.PaginationDto, Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "findPreValidationsByDocument", null);
__decorate([
    (0, common_1.Get)('pre-validation/:recordId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get a pre-validation record by ID',
        description: 'Returns status and results once the job completes.',
    }),
    openapi.ApiResponse({ status: 200, type: require("./entities/pre-validation-record.entity").PreValidationRecord }),
    __param(0, (0, common_1.Param)('recordId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "findPreValidationById", null);
exports.AnalysisController = AnalysisController = __decorate([
    (0, swagger_1.ApiTags)('analysis'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('projects/:projectId'),
    __metadata("design:paramtypes", [analysis_service_1.AnalysisService])
], AnalysisController);
//# sourceMappingURL=analysis.controller.js.map