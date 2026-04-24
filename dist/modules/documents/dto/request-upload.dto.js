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
exports.RequestUploadDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const document_entity_1 = require("../entities/document.entity");
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
class RequestUploadDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { fileName: { required: true, type: () => String, maxLength: 255 }, mimeType: { required: true, type: () => String, enum: ALLOWED_MIME_TYPES }, fileSizeBytes: { required: true, type: () => Number, minimum: 1, maximum: 104857600 }, documentType: { required: false, enum: require("../entities/document.entity").DocumentType } };
    }
}
exports.RequestUploadDto = RequestUploadDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'memoria_descriptiva.pdf' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], RequestUploadDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'application/pdf', enum: ALLOWED_MIME_TYPES }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(ALLOWED_MIME_TYPES),
    __metadata("design:type", String)
], RequestUploadDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File size in bytes', maximum: 104857600 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(104857600),
    __metadata("design:type", Number)
], RequestUploadDto.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: document_entity_1.DocumentType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(document_entity_1.DocumentType),
    __metadata("design:type", String)
], RequestUploadDto.prototype, "documentType", void 0);
//# sourceMappingURL=request-upload.dto.js.map