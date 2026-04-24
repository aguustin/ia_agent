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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatContextService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const projects_service_1 = require("../../projects/projects.service");
const document_entity_1 = require("../../documents/entities/document.entity");
const analysis_entity_1 = require("../../analysis/entities/analysis.entity");
const pre_validation_record_entity_1 = require("../../analysis/entities/pre-validation-record.entity");
const ai_provider_interface_1 = require("../../../providers/ai/ai-provider.interface");
const MAX_DOCUMENTS = 15;
const MAX_PRE_VALIDATIONS = 3;
const MAX_ANALYSES = 3;
const MAX_ISSUES_PER_ANALYSIS = 10;
const SYSTEM_INTRO = `\
Eres un experto consultor de proyectos de construcción, especializado en normativa española \
de edificación (CTE, LOE, PGOU y normativa municipal de licencias de obras).

Tu misión es responder preguntas sobre el estado del proyecto: qué documentos faltan, \
qué errores se han detectado, cuál es la puntuación de cumplimiento y qué acciones tomar.

A continuación dispones del contexto completo del proyecto:`;
const SYSTEM_FOOTER = `\
## INSTRUCCIONES DE RESPUESTA
- Responde siempre en el idioma del usuario (español o inglés).
- Cita la normativa concreta cuando sea relevante (ej. "CTE DB-SI artículo 3.2").
- Si el contexto no contiene información suficiente para responder con certeza, indícalo.
- Sé preciso y accionable: no des respuestas genéricas si el contexto tiene datos específicos.`;
let ChatContextService = class ChatContextService {
    constructor(documentRepo, analysisRepo, preValidationRepo, projectsService) {
        this.documentRepo = documentRepo;
        this.analysisRepo = analysisRepo;
        this.preValidationRepo = preValidationRepo;
        this.projectsService = projectsService;
    }
    async buildSystemContext(projectId, tenantId) {
        const [project, documents, preValidations, analyses] = await Promise.all([
            this.projectsService.findById(projectId, tenantId),
            this.fetchDocuments(projectId, tenantId),
            this.fetchPreValidations(projectId, tenantId),
            this.fetchAnalyses(projectId, tenantId),
        ]);
        const contextBody = [
            this.formatProject(project),
            this.formatDocuments(documents),
            this.formatPreValidations(preValidations, documents),
            this.formatAnalyses(analyses),
        ].join('\n\n');
        return [SYSTEM_INTRO, '', contextBody, '', SYSTEM_FOOTER].join('\n');
    }
    fetchDocuments(projectId, tenantId) {
        return this.documentRepo.find({
            where: { projectId, tenantId },
            order: { createdAt: 'DESC' },
            take: MAX_DOCUMENTS,
        });
    }
    fetchPreValidations(projectId, tenantId) {
        return this.preValidationRepo.find({
            where: { projectId, tenantId, status: pre_validation_record_entity_1.PreValidationStatus.COMPLETED },
            order: { completedAt: 'DESC' },
            take: MAX_PRE_VALIDATIONS,
        });
    }
    async fetchAnalyses(projectId, tenantId) {
        const analyses = await this.analysisRepo.find({
            where: { projectId, tenantId, status: analysis_entity_1.AnalysisStatus.COMPLETED },
            relations: ['issues', 'document'],
            order: { completedAt: 'DESC' },
            take: MAX_ANALYSES,
        });
        return analyses.map((a) => ({ ...a, issues: this.prioritiseIssues(a.issues ?? []) }));
    }
    prioritiseIssues(issues) {
        const order = {
            [ai_provider_interface_1.IssueSeverity.CRITICAL]: 0,
            [ai_provider_interface_1.IssueSeverity.HIGH]: 1,
            [ai_provider_interface_1.IssueSeverity.MEDIUM]: 2,
            [ai_provider_interface_1.IssueSeverity.LOW]: 3,
            [ai_provider_interface_1.IssueSeverity.INFO]: 4,
        };
        return [...issues]
            .sort((a, b) => (order[a.severity] ?? 5) - (order[b.severity] ?? 5))
            .slice(0, MAX_ISSUES_PER_ANALYSIS);
    }
    formatProject(project) {
        const lines = [
            '## PROYECTO',
            `Nombre: ${project.name}`,
            project.description ? `Descripción: ${project.description}` : null,
            `Estado: ${project.status} | Tipo: ${project.type}`,
            project.location ? `Ubicación: ${project.location}` : null,
            project.referenceNumber ? `Referencia: ${project.referenceNumber}` : null,
        ];
        return lines.filter(Boolean).join('\n');
    }
    formatDocuments(docs) {
        if (docs.length === 0) {
            return '## DOCUMENTOS\nNo hay documentos en este proyecto.';
        }
        const lines = docs.map((doc, i) => `${i + 1}. ${doc.originalName}` +
            ` [${this.mimeLabel(doc.mimeType)}, ${this.bytesLabel(doc.fileSizeBytes)}]` +
            ` — ${this.statusLabel(doc.status)}`);
        return [`## DOCUMENTOS (${docs.length})`, ...lines].join('\n');
    }
    formatPreValidations(records, docs) {
        if (records.length === 0) {
            return '## PRE-VALIDACIONES\nNo hay pre-validaciones completadas.';
        }
        const docName = new Map(docs.map((d) => [d.id, d.originalName]));
        const sections = records.map((rec) => {
            const name = docName.get(rec.documentId) ?? rec.documentId;
            const date = rec.completedAt?.toISOString().slice(0, 10) ?? '—';
            const lines = [`### ${name} (${date})`];
            if (rec.faltantes?.length) {
                lines.push(`FALTANTES (${rec.faltantes.length}):`);
                rec.faltantes.forEach((f) => lines.push(`  • ${f}`));
            }
            if (rec.errores?.length) {
                lines.push(`ERRORES (${rec.errores.length}):`);
                rec.errores.forEach((e) => lines.push(`  • ${e}`));
            }
            if (rec.advertencias?.length) {
                lines.push(`ADVERTENCIAS (${rec.advertencias.length}):`);
                rec.advertencias.forEach((a) => lines.push(`  • ${a}`));
            }
            if (!rec.faltantes?.length && !rec.errores?.length && !rec.advertencias?.length) {
                lines.push('  Sin hallazgos.');
            }
            return lines.join('\n');
        });
        return [`## PRE-VALIDACIONES RECIENTES (${records.length})`, ...sections].join('\n\n');
    }
    formatAnalyses(analyses) {
        if (analyses.length === 0) {
            return '## ANÁLISIS DE CUMPLIMIENTO\nNo hay análisis completados.';
        }
        const sections = analyses.map((analysis) => {
            const docLabel = analysis.document?.originalName ?? analysis.documentId;
            const score = analysis.complianceScore != null ? `${analysis.complianceScore}/100` : 'N/A';
            const date = analysis.completedAt?.toISOString().slice(0, 10) ?? '—';
            const lines = [`### ${docLabel} — Score: ${score} (${date})`];
            if (analysis.summary)
                lines.push(`Resumen: ${analysis.summary}`);
            if (analysis.issues?.length) {
                lines.push(`Problemas encontrados (${analysis.issues.length}):`);
                analysis.issues.forEach((issue) => {
                    const loc = issue.location ? ` — ${issue.location}` : '';
                    const reg = issue.regulation ? ` [${issue.regulation}]` : '';
                    lines.push(`  • [${issue.severity.toUpperCase()}/${issue.type}] ${issue.description}${loc}${reg}`);
                    if (issue.recommendation)
                        lines.push(`    → ${issue.recommendation}`);
                });
            }
            if (analysis.recommendations?.length) {
                lines.push('Recomendaciones generales:');
                analysis.recommendations
                    .slice(0, 5)
                    .forEach((r) => lines.push(`  • ${r}`));
            }
            return lines.join('\n');
        });
        return [`## ANÁLISIS DE CUMPLIMIENTO RECIENTES (${analyses.length})`, ...sections].join('\n\n');
    }
    bytesLabel(bytes) {
        if (bytes < 1_024)
            return `${bytes} B`;
        if (bytes < 1_048_576)
            return `${(bytes / 1_024).toFixed(1)} KB`;
        return `${(bytes / 1_048_576).toFixed(1)} MB`;
    }
    mimeLabel(mime) {
        const map = {
            'application/pdf': 'PDF',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
            'application/msword': 'Word',
            'image/jpeg': 'JPEG',
            'image/png': 'PNG',
            'image/tiff': 'TIFF',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
        };
        return map[mime] ?? mime;
    }
    statusLabel(status) {
        const map = {
            [document_entity_1.DocumentStatus.PENDING_UPLOAD]: 'Pendiente de subida',
            [document_entity_1.DocumentStatus.UPLOADED]: 'Subido',
            [document_entity_1.DocumentStatus.PROCESSING]: 'Procesando',
            [document_entity_1.DocumentStatus.PROCESSED]: 'Procesado',
            [document_entity_1.DocumentStatus.ERROR]: 'Error',
        };
        return map[status] ?? status;
    }
};
exports.ChatContextService = ChatContextService;
exports.ChatContextService = ChatContextService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(document_entity_1.Document)),
    __param(1, (0, typeorm_1.InjectRepository)(analysis_entity_1.Analysis)),
    __param(2, (0, typeorm_1.InjectRepository)(pre_validation_record_entity_1.PreValidationRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        projects_service_1.ProjectsService])
], ChatContextService);
//# sourceMappingURL=chat-context.service.js.map