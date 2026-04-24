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
exports.Analysis = exports.AnalysisStatus = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const document_entity_1 = require("../../documents/entities/document.entity");
const project_entity_1 = require("../../projects/entities/project.entity");
const analysis_issue_entity_1 = require("./analysis-issue.entity");
var AnalysisStatus;
(function (AnalysisStatus) {
    AnalysisStatus["QUEUED"] = "queued";
    AnalysisStatus["PROCESSING"] = "processing";
    AnalysisStatus["COMPLETED"] = "completed";
    AnalysisStatus["FAILED"] = "failed";
})(AnalysisStatus || (exports.AnalysisStatus = AnalysisStatus = {}));
let Analysis = class Analysis {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, status: { required: true, enum: require("./analysis.entity").AnalysisStatus }, summary: { required: true, type: () => String, nullable: true }, complianceScore: { required: true, type: () => Number, nullable: true }, recommendations: { required: true, type: () => [String], nullable: true }, metadata: { required: true, type: () => Object, nullable: true }, errorMessage: { required: true, type: () => String, nullable: true }, startedAt: { required: true, type: () => Date, nullable: true }, completedAt: { required: true, type: () => Date, nullable: true }, documentId: { required: true, type: () => String }, document: { required: true, type: () => require("../../documents/entities/document.entity").Document }, projectId: { required: true, type: () => String }, project: { required: true, type: () => require("../../projects/entities/project.entity").Project }, tenantId: { required: true, type: () => String }, issues: { required: true, type: () => [require("./analysis-issue.entity").AnalysisIssue] }, createdAt: { required: true, type: () => Date }, updatedAt: { required: true, type: () => Date } };
    }
};
exports.Analysis = Analysis;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Analysis.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AnalysisStatus,
        default: AnalysisStatus.QUEUED,
    }),
    __metadata("design:type", String)
], Analysis.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Analysis.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'compliance_score',
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Analysis.prototype, "complianceScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Analysis.prototype, "recommendations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Analysis.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Analysis.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Analysis.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Analysis.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_id' }),
    __metadata("design:type", String)
], Analysis.prototype, "documentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => document_entity_1.Document, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'document_id' }),
    __metadata("design:type", document_entity_1.Document)
], Analysis.prototype, "document", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], Analysis.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], Analysis.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], Analysis.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => analysis_issue_entity_1.AnalysisIssue, (issue) => issue.analysis, { cascade: true }),
    __metadata("design:type", Array)
], Analysis.prototype, "issues", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Analysis.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Analysis.prototype, "updatedAt", void 0);
exports.Analysis = Analysis = __decorate([
    (0, typeorm_1.Entity)('analyses'),
    (0, typeorm_1.Index)(['documentId', 'status']),
    (0, typeorm_1.Index)(['projectId', 'createdAt'])
], Analysis);
//# sourceMappingURL=analysis.entity.js.map