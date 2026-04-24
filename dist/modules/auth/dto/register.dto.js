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
exports.RegisterDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const create_user_dto_1 = require("../../users/dto/create-user.dto");
const create_tenant_dto_1 = require("../../tenants/dto/create-tenant.dto");
class RegisterDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { organization: { required: true, type: () => require("../../tenants/dto/create-tenant.dto").CreateTenantDto }, admin: { required: true, type: () => require("../../users/dto/create-user.dto").CreateUserDto } };
    }
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Organization details' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => create_tenant_dto_1.CreateTenantDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", create_tenant_dto_1.CreateTenantDto)
], RegisterDto.prototype, "organization", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Admin user details' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => create_user_dto_1.CreateUserDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", create_user_dto_1.CreateUserDto)
], RegisterDto.prototype, "admin", void 0);
//# sourceMappingURL=register.dto.js.map