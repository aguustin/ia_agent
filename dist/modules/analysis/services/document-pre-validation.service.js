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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DocumentPreValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentPreValidationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ai_provider_interface_1 = require("../../../providers/ai/ai-provider.interface");
const file_storage_interface_1 = require("../../../providers/storage/file-storage.interface");
const storage_errors_1 = require("../../../providers/storage/storage.errors");
const document_entity_1 = require("../../documents/entities/document.entity");
const domain_exception_1 = require("../../../common/exceptions/domain.exception");
const text_extractor_service_1 = require("./text-extractor.service");
const pre_validation_errors_1 = require("../errors/pre-validation.errors");
const SYSTEM_CONTEXT = 'Eres un revisor técnico de expedientes de obras. ' +
    'Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código. ' +
    'El JSON debe contener exactamente tres claves: ' +
    '"faltantes", "errores" y "advertencias", cada una con un array de strings.';
let DocumentPreValidationService = DocumentPreValidationService_1 = class DocumentPreValidationService {
    constructor(documentRepo, fileStorage, ai, textExtractor) {
        this.documentRepo = documentRepo;
        this.fileStorage = fileStorage;
        this.ai = ai;
        this.textExtractor = textExtractor;
        this.logger = new common_1.Logger(DocumentPreValidationService_1.name);
    }
    async analyzeDocument(documentId, tenantId) {
        this.logger.log(`Pre-validation started — document: ${documentId}`);
        const document = await this.loadDocument(documentId, tenantId);
        const buffer = await this.downloadFile(document);
        const content = await this.extractText(buffer, document.mimeType, document.id);
        if (!content.trim()) {
            throw new pre_validation_errors_1.PreValidationTextExtractionError(documentId, new Error('Extracted content is empty — cannot send a blank document to the AI'));
        }
        const prompt = this.buildPrompt(content);
        const rawResponse = await this.callAI(prompt);
        const result = this.parseResponse(rawResponse);
        this.logger.log(`Pre-validation finished — document: ${documentId} | ` +
            `faltantes: ${result.faltantes.length}, ` +
            `errores: ${result.errores.length}, ` +
            `advertencias: ${result.advertencias.length}`);
        return result;
    }
    async loadDocument(documentId, tenantId) {
        const doc = await this.documentRepo.findOne({ where: { id: documentId, tenantId } });
        if (!doc)
            throw new domain_exception_1.ResourceNotFoundException('Document', documentId);
        return doc;
    }
    async downloadFile(document) {
        try {
            return await this.fileStorage.download(document.fileKey);
        }
        catch (error) {
            if (error instanceof storage_errors_1.StorageFileNotFoundError) {
                throw new pre_validation_errors_1.PreValidationFileError(document.id, new Error(`File '${document.fileKey}' was not found in storage — ` +
                    'it may have been deleted externally.'));
            }
            if (error instanceof storage_errors_1.StorageError) {
                throw new pre_validation_errors_1.PreValidationFileError(document.id, error);
            }
            throw error;
        }
    }
    async extractText(buffer, mimeType, documentId) {
        try {
            const result = await this.textExtractor.extract(buffer, mimeType);
            return result.text;
        }
        catch (error) {
            throw new pre_validation_errors_1.PreValidationTextExtractionError(documentId, error);
        }
    }
    buildPrompt(contenido) {
        return `\
Actúa como un revisor técnico de expedientes de obras en Argentina.

Analiza el siguiente documento y devuelve un JSON con:

- faltantes
- errores
- advertencias

Reglas:
- No inventes información
- Si no estás seguro, colócalo como advertencia
- Sé específico (ej: "Falta plano eléctrico", no "falta información")

Documento:
${contenido}`;
    }
    async callAI(prompt) {
        let response;
        try {
            response = await this.ai.chat({
                messages: [{ role: 'user', content: prompt }],
                systemContext: SYSTEM_CONTEXT,
            });
        }
        catch (error) {
            throw new pre_validation_errors_1.PreValidationAIError(error);
        }
        if (!response?.trim()) {
            throw new pre_validation_errors_1.PreValidationAIError(new Error('AI returned an empty response'));
        }
        return response;
    }
    parseResponse(response) {
        const jsonString = this.extractJsonBlock(response);
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        }
        catch {
            throw new pre_validation_errors_1.PreValidationInvalidResponseError(`Response is not valid JSON. Received: "${response.slice(0, 300)}"`);
        }
        return this.validateResult(parsed);
    }
    extractJsonBlock(text) {
        const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (fenceMatch?.[1])
            return fenceMatch[1].trim();
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end > start)
            return text.slice(start, end + 1);
        return text.trim();
    }
    validateResult(raw) {
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new pre_validation_errors_1.PreValidationInvalidResponseError(`Expected an object, got ${Array.isArray(raw) ? 'array' : typeof raw}`);
        }
        const payload = raw;
        const fields = ['faltantes', 'errores', 'advertencias'];
        for (const field of fields) {
            const value = payload[field];
            if (!Array.isArray(value)) {
                throw new pre_validation_errors_1.PreValidationInvalidResponseError(`Field '${field}' must be an array, got ${typeof value}`);
            }
            const badIndex = value.findIndex((item) => typeof item !== 'string');
            if (badIndex !== -1) {
                throw new pre_validation_errors_1.PreValidationInvalidResponseError(`Field '${field}[${badIndex}]' must be a string, got ${typeof value[badIndex]}`);
            }
        }
        return {
            faltantes: payload['faltantes'],
            errores: payload['errores'],
            advertencias: payload['advertencias'],
        };
    }
};
exports.DocumentPreValidationService = DocumentPreValidationService;
exports.DocumentPreValidationService = DocumentPreValidationService = DocumentPreValidationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(document_entity_1.Document)),
    __param(1, (0, common_1.Inject)(file_storage_interface_1.FILE_STORAGE_SERVICE)),
    __param(2, (0, common_1.Inject)(ai_provider_interface_1.AI_PROVIDER_TOKEN)),
    __metadata("design:paramtypes", [typeorm_2.Repository, Object, Object, text_extractor_service_1.TextExtractorService])
], DocumentPreValidationService);
//# sourceMappingURL=document-pre-validation.service.js.map