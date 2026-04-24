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
exports.Document = exports.MAX_FILE_SIZE_BYTES = exports.DocumentType = exports.DocumentStatus = void 0;
exports.isAllowedMimeType = isAllowedMimeType;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const project_entity_1 = require("../../projects/entities/project.entity");
const user_entity_1 = require("../../users/entities/user.entity");
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["PENDING_UPLOAD"] = "pending_upload";
    DocumentStatus["UPLOADED"] = "uploaded";
    DocumentStatus["PROCESSING"] = "processing";
    DocumentStatus["PROCESSED"] = "processed";
    DocumentStatus["ERROR"] = "error";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
var DocumentType;
(function (DocumentType) {
    DocumentType["ARCHITECTURAL"] = "architectural";
    DocumentType["STRUCTURAL"] = "structural";
    DocumentType["ELECTRICAL"] = "electrical";
    DocumentType["PLUMBING"] = "plumbing";
    DocumentType["HVAC"] = "hvac";
    DocumentType["SURVEY"] = "survey";
    DocumentType["ENVIRONMENTAL"] = "environmental";
    DocumentType["REPORT"] = "report";
    DocumentType["OTHER"] = "other";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
function isAllowedMimeType(mime) {
    return ALLOWED_MIME_TYPES.includes(mime);
}
exports.MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
let Document = class Document {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, name: { required: true, type: () => String }, originalName: { required: true, type: () => String }, fileKey: { required: true, type: () => String }, mimeType: { required: true, type: () => String }, fileSizeBytes: { required: true, type: () => Number }, status: { required: true, enum: require("./document.entity").DocumentStatus }, documentType: { required: true, enum: require("./document.entity").DocumentType }, projectId: { required: true, type: () => String }, project: { required: true, type: () => require("../../projects/entities/project.entity").Project }, uploadedById: { required: true, type: () => String }, uploadedBy: { required: true, type: () => require("../../users/entities/user.entity").User }, tenantId: { required: true, type: () => String }, createdAt: { required: true, type: () => Date }, updatedAt: { required: true, type: () => Date } };
    }
};
exports.Document = Document;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Document.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], Document.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'original_name', length: 255 }),
    __metadata("design:type", String)
], Document.prototype, "originalName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_key' }),
    __metadata("design:type", String)
], Document.prototype, "fileKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mime_type', length: 127 }),
    __metadata("design:type", String)
], Document.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_size_bytes', type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], Document.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DocumentStatus,
        default: DocumentStatus.PENDING_UPLOAD,
    }),
    __metadata("design:type", String)
], Document.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DocumentType,
        default: DocumentType.OTHER,
        name: 'document_type',
    }),
    __metadata("design:type", String)
], Document.prototype, "documentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], Document.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], Document.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploaded_by_id' }),
    __metadata("design:type", String)
], Document.prototype, "uploadedById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'uploaded_by_id' }),
    __metadata("design:type", user_entity_1.User)
], Document.prototype, "uploadedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], Document.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Document.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Document.prototype, "updatedAt", void 0);
exports.Document = Document = __decorate([
    (0, typeorm_1.Entity)('documents'),
    (0, typeorm_1.Index)(['projectId', 'status'])
], Document);
//# sourceMappingURL=document.entity.js.map