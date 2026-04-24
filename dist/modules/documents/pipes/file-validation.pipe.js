"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileValidationPipe = void 0;
const common_1 = require("@nestjs/common");
const document_entity_1 = require("../entities/document.entity");
let FileValidationPipe = class FileValidationPipe {
    transform(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided. Send a multipart/form-data request with field name "file".');
        }
        if (!(0, document_entity_1.isAllowedMimeType)(file.mimetype)) {
            throw new common_1.BadRequestException(`File type '${file.mimetype}' is not allowed. ` +
                'Accepted types: PDF, DOCX, DOC, JPEG, PNG, TIFF, XLSX.');
        }
        if (file.size > document_entity_1.MAX_FILE_SIZE_BYTES) {
            const sizeMb = Math.round(file.size / (1024 * 1024));
            throw new common_1.BadRequestException(`File size ${sizeMb}MB exceeds the maximum allowed size of 100MB.`);
        }
        if (!file.buffer || file.buffer.length === 0) {
            throw new common_1.BadRequestException('Uploaded file is empty.');
        }
        return file;
    }
};
exports.FileValidationPipe = FileValidationPipe;
exports.FileValidationPipe = FileValidationPipe = __decorate([
    (0, common_1.Injectable)()
], FileValidationPipe);
//# sourceMappingURL=file-validation.pipe.js.map