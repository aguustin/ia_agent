"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TextExtractorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextExtractorService = void 0;
const common_1 = require("@nestjs/common");
const pdfParse = require("pdf-parse");
const MAX_CHARS = 80_000;
let TextExtractorService = TextExtractorService_1 = class TextExtractorService {
    constructor() {
        this.logger = new common_1.Logger(TextExtractorService_1.name);
    }
    async extract(buffer, mimeType) {
        if (mimeType === 'application/pdf')
            return this.fromPdf(buffer);
        if (mimeType.startsWith('image/'))
            return this.fromImage(mimeType);
        if (mimeType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return this.fromDocx(buffer);
        }
        return this.fromPlainText(buffer);
    }
    async fromPdf(buffer) {
        const data = await pdfParse(buffer);
        return this.finalize(data.text ?? '', data.numpages ?? 0, 'pdf-parse');
    }
    fromImage(mimeType) {
        return {
            text: [
                `[Documento de imagen (${mimeType}).]`,
                'No es posible extraer texto automáticamente.',
                'El análisis se realizará en base a los metadatos del documento.',
            ].join(' '),
            pageCount: 1,
            truncated: false,
            method: 'image-placeholder',
        };
    }
    fromDocx(buffer) {
        const raw = buffer
            .toString('utf-8')
            .replace(/[^\x20-\x7E\n\r\tÀ-ſ]/g, ' ')
            .replace(/ {2,}/g, ' ')
            .trim();
        return this.finalize(raw, 0, 'utf8-fallback');
    }
    fromPlainText(buffer) {
        return this.finalize(buffer.toString('utf-8'), 0, 'utf8');
    }
    finalize(raw, pageCount, method) {
        const truncated = raw.length > MAX_CHARS;
        if (truncated) {
            this.logger.warn(`Content truncated for LLM: ${raw.length} → ${MAX_CHARS} chars (method: ${method})`);
        }
        return {
            text: truncated ? raw.slice(0, MAX_CHARS) : raw,
            pageCount,
            truncated,
            method,
        };
    }
};
exports.TextExtractorService = TextExtractorService;
exports.TextExtractorService = TextExtractorService = TextExtractorService_1 = __decorate([
    (0, common_1.Injectable)()
], TextExtractorService);
//# sourceMappingURL=text-extractor.service.js.map