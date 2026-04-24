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
exports.PreValidationRecord = exports.PreValidationStatus = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const document_entity_1 = require("../../documents/entities/document.entity");
var PreValidationStatus;
(function (PreValidationStatus) {
    PreValidationStatus["QUEUED"] = "queued";
    PreValidationStatus["PROCESSING"] = "processing";
    PreValidationStatus["COMPLETED"] = "completed";
    PreValidationStatus["FAILED"] = "failed";
})(PreValidationStatus || (exports.PreValidationStatus = PreValidationStatus = {}));
let PreValidationRecord = class PreValidationRecord {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, status: { required: true, enum: require("./pre-validation-record.entity").PreValidationStatus }, faltantes: { required: true, type: () => [String], nullable: true, description: "Required items absent or incomplete in the document. Null until completed." }, errores: { required: true, type: () => [String], nullable: true, description: "Regulatory non-compliance issues or data errors. Null until completed." }, advertencias: { required: true, type: () => [String], nullable: true, description: "Items requiring attention but not outright errors. Null until completed." }, errorMessage: { required: true, type: () => String, nullable: true }, startedAt: { required: true, type: () => Date, nullable: true }, completedAt: { required: true, type: () => Date, nullable: true }, documentId: { required: true, type: () => String }, document: { required: true, type: () => require("../../documents/entities/document.entity").Document }, projectId: { required: true, type: () => String }, tenantId: { required: true, type: () => String }, createdAt: { required: true, type: () => Date }, updatedAt: { required: true, type: () => Date } };
    }
};
exports.PreValidationRecord = PreValidationRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PreValidationRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PreValidationStatus,
        default: PreValidationStatus.QUEUED,
    }),
    __metadata("design:type", String)
], PreValidationRecord.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PreValidationRecord.prototype, "faltantes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PreValidationRecord.prototype, "errores", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PreValidationRecord.prototype, "advertencias", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PreValidationRecord.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PreValidationRecord.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PreValidationRecord.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_id' }),
    __metadata("design:type", String)
], PreValidationRecord.prototype, "documentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => document_entity_1.Document, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'document_id' }),
    __metadata("design:type", document_entity_1.Document)
], PreValidationRecord.prototype, "document", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], PreValidationRecord.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], PreValidationRecord.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PreValidationRecord.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PreValidationRecord.prototype, "updatedAt", void 0);
exports.PreValidationRecord = PreValidationRecord = __decorate([
    (0, typeorm_1.Entity)('pre_validation_records'),
    (0, typeorm_1.Index)(['documentId', 'tenantId']),
    (0, typeorm_1.Index)(['documentId', 'status'])
], PreValidationRecord);
//# sourceMappingURL=pre-validation-record.entity.js.map