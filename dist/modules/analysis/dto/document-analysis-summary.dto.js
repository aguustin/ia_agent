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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentAnalysisSummaryDto = exports.PreValidationSummaryDto = exports.ComplianceDto = exports.IssueDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const ai_provider_interface_1 = require("../../../providers/ai/ai-provider.interface");
const analysis_entity_1 = require("../entities/analysis.entity");
const pre_validation_record_entity_1 = require("../entities/pre-validation-record.entity");
class IssueDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { severity: { required: true, enum: require("../../../providers/ai/ai-provider.interface").IssueSeverity }, type: { required: true, enum: require("../../../providers/ai/ai-provider.interface").IssueType }, description: { required: true, type: () => String }, location: { required: true, type: () => String, nullable: true }, recommendation: { required: true, type: () => String, nullable: true }, regulation: { required: true, type: () => String, nullable: true } };
    }
}
exports.IssueDto = IssueDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ai_provider_interface_1.IssueSeverity }),
    __metadata("design:type", String)
], IssueDto.prototype, "severity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ai_provider_interface_1.IssueType }),
    __metadata("design:type", String)
], IssueDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], IssueDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], IssueDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], IssueDto.prototype, "recommendation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], IssueDto.prototype, "regulation", void 0);
class ComplianceDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { analysisId: { required: true, type: () => String }, status: { required: true, enum: require("../entities/analysis.entity").AnalysisStatus }, complianceScore: { required: true, type: () => Number, nullable: true }, summary: { required: true, type: () => String, nullable: true }, issues: { required: true, type: () => [require("./document-analysis-summary.dto").IssueDto] }, errorMessage: { required: true, type: () => String, nullable: true }, completedAt: { required: true, type: () => Date, nullable: true } };
    }
}
exports.ComplianceDto = ComplianceDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ComplianceDto.prototype, "analysisId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: analysis_entity_1.AnalysisStatus }),
    __metadata("design:type", String)
], ComplianceDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Number, nullable: true }),
    __metadata("design:type", Object)
], ComplianceDto.prototype, "complianceScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ComplianceDto.prototype, "summary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [IssueDto] }),
    __metadata("design:type", Array)
], ComplianceDto.prototype, "issues", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ComplianceDto.prototype, "errorMessage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ComplianceDto.prototype, "completedAt", void 0);
class PreValidationSummaryDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { recordId: { required: true, type: () => String }, status: { required: true, enum: require("../entities/pre-validation-record.entity").PreValidationStatus }, faltantes: { required: true, type: () => [String] }, errores: { required: true, type: () => [String] }, advertencias: { required: true, type: () => [String] }, completedAt: { required: true, type: () => Date, nullable: true } };
    }
}
exports.PreValidationSummaryDto = PreValidationSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PreValidationSummaryDto.prototype, "recordId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: pre_validation_record_entity_1.PreValidationStatus }),
    __metadata("design:type", String)
], PreValidationSummaryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], PreValidationSummaryDto.prototype, "faltantes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], PreValidationSummaryDto.prototype, "errores", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], PreValidationSummaryDto.prototype, "advertencias", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], PreValidationSummaryDto.prototype, "completedAt", void 0);
class DocumentAnalysisSummaryDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { documentId: { required: true, type: () => String }, compliance: { required: true, type: () => require("./document-analysis-summary.dto").ComplianceDto, nullable: true }, preValidation: { required: true, type: () => require("./document-analysis-summary.dto").PreValidationSummaryDto, nullable: true } };
    }
}
exports.DocumentAnalysisSummaryDto = DocumentAnalysisSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], DocumentAnalysisSummaryDto.prototype, "documentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: ComplianceDto, nullable: true }),
    __metadata("design:type", Object)
], DocumentAnalysisSummaryDto.prototype, "compliance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: PreValidationSummaryDto, nullable: true }),
    __metadata("design:type", Object)
], DocumentAnalysisSummaryDto.prototype, "preValidation", void 0);
//# sourceMappingURL=document-analysis-summary.dto.js.map