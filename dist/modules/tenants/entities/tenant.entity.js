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
exports.Tenant = exports.TenantPlan = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const class_transformer_1 = require("class-transformer");
var TenantPlan;
(function (TenantPlan) {
    TenantPlan["FREE"] = "free";
    TenantPlan["STARTER"] = "starter";
    TenantPlan["PROFESSIONAL"] = "professional";
    TenantPlan["ENTERPRISE"] = "enterprise";
})(TenantPlan || (exports.TenantPlan = TenantPlan = {}));
const PLAN_LIMITS = {
    [TenantPlan.FREE]: {
        maxProjects: 3,
        maxDocumentsPerProject: 10,
        maxAnalysesPerMonth: 20,
        maxStorageGb: 1,
    },
    [TenantPlan.STARTER]: {
        maxProjects: 20,
        maxDocumentsPerProject: 50,
        maxAnalysesPerMonth: 200,
        maxStorageGb: 10,
    },
    [TenantPlan.PROFESSIONAL]: {
        maxProjects: 100,
        maxDocumentsPerProject: 200,
        maxAnalysesPerMonth: 1000,
        maxStorageGb: 50,
    },
    [TenantPlan.ENTERPRISE]: {
        maxProjects: -1,
        maxDocumentsPerProject: -1,
        maxAnalysesPerMonth: -1,
        maxStorageGb: 500,
    },
};
let Tenant = class Tenant {
    get limits() {
        return PLAN_LIMITS[this.plan];
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, slug: { required: true, type: () => String }, name: { required: true, type: () => String }, plan: { required: true, enum: require("./tenant.entity").TenantPlan }, isActive: { required: true, type: () => Boolean }, settings: { required: true, type: () => Object, nullable: true }, createdAt: { required: true, type: () => Date }, updatedAt: { required: true, type: () => Date } };
    }
};
exports.Tenant = Tenant;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Tenant.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 63 }),
    __metadata("design:type", String)
], Tenant.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], Tenant.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TenantPlan,
        default: TenantPlan.FREE,
    }),
    __metadata("design:type", String)
], Tenant.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Tenant.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Object)
], Tenant.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Tenant.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Tenant.prototype, "updatedAt", void 0);
exports.Tenant = Tenant = __decorate([
    (0, typeorm_1.Entity)('tenants')
], Tenant);
//# sourceMappingURL=tenant.entity.js.map