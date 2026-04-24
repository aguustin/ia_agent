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
exports.Project = exports.ProjectType = exports.ProjectStatus = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const tenant_entity_1 = require("../../tenants/entities/tenant.entity");
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["DRAFT"] = "draft";
    ProjectStatus["IN_REVIEW"] = "in_review";
    ProjectStatus["APPROVED"] = "approved";
    ProjectStatus["REJECTED"] = "rejected";
    ProjectStatus["ARCHIVED"] = "archived";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
var ProjectType;
(function (ProjectType) {
    ProjectType["RESIDENTIAL"] = "residential";
    ProjectType["COMMERCIAL"] = "commercial";
    ProjectType["INDUSTRIAL"] = "industrial";
    ProjectType["INFRASTRUCTURE"] = "infrastructure";
    ProjectType["RENOVATION"] = "renovation";
    ProjectType["OTHER"] = "other";
})(ProjectType || (exports.ProjectType = ProjectType = {}));
let Project = class Project {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, name: { required: true, type: () => String }, description: { required: true, type: () => String, nullable: true }, status: { required: true, enum: require("./project.entity").ProjectStatus }, type: { required: true, enum: require("./project.entity").ProjectType }, location: { required: true, type: () => String, nullable: true }, referenceNumber: { required: true, type: () => String, nullable: true }, metadata: { required: true, type: () => Object, nullable: true }, tenantId: { required: true, type: () => String }, tenant: { required: true, type: () => require("../../tenants/entities/tenant.entity").Tenant }, ownerId: { required: true, type: () => String }, owner: { required: true, type: () => require("../../users/entities/user.entity").User }, createdAt: { required: true, type: () => Date }, updatedAt: { required: true, type: () => Date } };
    }
};
exports.Project = Project;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Project.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], Project.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ProjectStatus,
        default: ProjectStatus.DRAFT,
    }),
    __metadata("design:type", String)
], Project.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ProjectType,
        default: ProjectType.OTHER,
    }),
    __metadata("design:type", String)
], Project.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true, name: 'location' }),
    __metadata("design:type", Object)
], Project.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'reference_number', length: 100, nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "referenceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], Project.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], Project.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'owner_id' }),
    __metadata("design:type", String)
], Project.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'owner_id' }),
    __metadata("design:type", user_entity_1.User)
], Project.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Project.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Project.prototype, "updatedAt", void 0);
exports.Project = Project = __decorate([
    (0, typeorm_1.Entity)('projects'),
    (0, typeorm_1.Index)(['tenantId', 'status'])
], Project);
//# sourceMappingURL=project.entity.js.map