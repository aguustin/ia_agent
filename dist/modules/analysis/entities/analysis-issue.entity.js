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
exports.AnalysisIssue = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const analysis_entity_1 = require("./analysis.entity");
const ai_provider_interface_1 = require("../../../providers/ai/ai-provider.interface");
let AnalysisIssue = class AnalysisIssue {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, type: { required: true, enum: require("../../../providers/ai/ai-provider.interface").IssueType }, severity: { required: true, enum: require("../../../providers/ai/ai-provider.interface").IssueSeverity }, description: { required: true, type: () => String }, location: { required: true, type: () => String, nullable: true }, recommendation: { required: true, type: () => String, nullable: true }, regulation: { required: true, type: () => String, nullable: true }, analysisId: { required: true, type: () => String }, analysis: { required: true, type: () => require("./analysis.entity").Analysis }, createdAt: { required: true, type: () => Date } };
    }
};
exports.AnalysisIssue = AnalysisIssue;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AnalysisIssue.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ai_provider_interface_1.IssueType }),
    __metadata("design:type", String)
], AnalysisIssue.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ai_provider_interface_1.IssueSeverity }),
    __metadata("design:type", String)
], AnalysisIssue.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], AnalysisIssue.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AnalysisIssue.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AnalysisIssue.prototype, "recommendation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], AnalysisIssue.prototype, "regulation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'analysis_id' }),
    __metadata("design:type", String)
], AnalysisIssue.prototype, "analysisId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => analysis_entity_1.Analysis, (analysis) => analysis.issues, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'analysis_id' }),
    __metadata("design:type", analysis_entity_1.Analysis)
], AnalysisIssue.prototype, "analysis", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AnalysisIssue.prototype, "createdAt", void 0);
exports.AnalysisIssue = AnalysisIssue = __decorate([
    (0, typeorm_1.Entity)('analysis_issues'),
    (0, typeorm_1.Index)(['analysisId', 'severity'])
], AnalysisIssue);
//# sourceMappingURL=analysis-issue.entity.js.map