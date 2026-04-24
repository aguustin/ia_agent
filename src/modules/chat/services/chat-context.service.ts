import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectsService } from '@modules/projects/projects.service';
import { Document, DocumentStatus } from '@modules/documents/entities/document.entity';
import { Analysis, AnalysisStatus } from '@modules/analysis/entities/analysis.entity';
import { AnalysisIssue } from '@modules/analysis/entities/analysis-issue.entity';
import {
  PreValidationRecord,
  PreValidationStatus,
} from '@modules/analysis/entities/pre-validation-record.entity';
import { IssueSeverity } from '@providers/ai/ai-provider.interface';

// ---------------------------------------------------------------------------
// Limits — keep context under ~3k tokens so there's room for history + reply
// ---------------------------------------------------------------------------
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

@Injectable()
export class ChatContextService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Analysis)
    private readonly analysisRepo: Repository<Analysis>,
    @InjectRepository(PreValidationRecord)
    private readonly preValidationRepo: Repository<PreValidationRecord>,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Builds the full system context string sent to the LLM on every request.
   * Runs all DB queries in parallel to minimise latency.
   */
  async buildSystemContext(projectId: string, tenantId: string): Promise<string> {
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

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  private fetchDocuments(projectId: string, tenantId: string): Promise<Document[]> {
    return this.documentRepo.find({
      where: { projectId, tenantId },
      order: { createdAt: 'DESC' },
      take: MAX_DOCUMENTS,
    });
  }

  private fetchPreValidations(
    projectId: string,
    tenantId: string,
  ): Promise<PreValidationRecord[]> {
    return this.preValidationRepo.find({
      where: { projectId, tenantId, status: PreValidationStatus.COMPLETED },
      order: { completedAt: 'DESC' },
      take: MAX_PRE_VALIDATIONS,
    });
  }

  private async fetchAnalyses(projectId: string, tenantId: string): Promise<Analysis[]> {
    const analyses = await this.analysisRepo.find({
      where: { projectId, tenantId, status: AnalysisStatus.COMPLETED },
      relations: ['issues', 'document'],
      order: { completedAt: 'DESC' },
      take: MAX_ANALYSES,
    });

    // Prioritise critical → high → rest, then cap per analysis.
    return analyses.map((a) => ({ ...a, issues: this.prioritiseIssues(a.issues ?? []) }));
  }

  private prioritiseIssues(issues: AnalysisIssue[]): AnalysisIssue[] {
    const order: Record<IssueSeverity, number> = {
      [IssueSeverity.CRITICAL]: 0,
      [IssueSeverity.HIGH]: 1,
      [IssueSeverity.MEDIUM]: 2,
      [IssueSeverity.LOW]: 3,
      [IssueSeverity.INFO]: 4,
    };
    return [...issues]
      .sort((a, b) => (order[a.severity] ?? 5) - (order[b.severity] ?? 5))
      .slice(0, MAX_ISSUES_PER_ANALYSIS);
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  private formatProject(project: Project): string {
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

  private formatDocuments(docs: Document[]): string {
    if (docs.length === 0) {
      return '## DOCUMENTOS\nNo hay documentos en este proyecto.';
    }

    const lines = docs.map(
      (doc, i) =>
        `${i + 1}. ${doc.originalName}` +
        ` [${this.mimeLabel(doc.mimeType)}, ${this.bytesLabel(doc.fileSizeBytes)}]` +
        ` — ${this.statusLabel(doc.status)}`,
    );

    return [`## DOCUMENTOS (${docs.length})`, ...lines].join('\n');
  }

  private formatPreValidations(records: PreValidationRecord[], docs: Document[]): string {
    if (records.length === 0) {
      return '## PRE-VALIDACIONES\nNo hay pre-validaciones completadas.';
    }

    const docName = new Map(docs.map((d) => [d.id, d.originalName]));

    const sections = records.map((rec) => {
      const name = docName.get(rec.documentId) ?? rec.documentId;
      const date = rec.completedAt?.toISOString().slice(0, 10) ?? '—';
      const lines: string[] = [`### ${name} (${date})`];

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

  private formatAnalyses(analyses: Analysis[]): string {
    if (analyses.length === 0) {
      return '## ANÁLISIS DE CUMPLIMIENTO\nNo hay análisis completados.';
    }

    const sections = analyses.map((analysis) => {
      const docLabel = (analysis as any).document?.originalName ?? analysis.documentId;
      const score = analysis.complianceScore != null ? `${analysis.complianceScore}/100` : 'N/A';
      const date = analysis.completedAt?.toISOString().slice(0, 10) ?? '—';

      const lines: string[] = [`### ${docLabel} — Score: ${score} (${date})`];

      if (analysis.summary) lines.push(`Resumen: ${analysis.summary}`);

      if (analysis.issues?.length) {
        lines.push(`Problemas encontrados (${analysis.issues.length}):`);
        analysis.issues.forEach((issue) => {
          const loc = issue.location ? ` — ${issue.location}` : '';
          const reg = issue.regulation ? ` [${issue.regulation}]` : '';
          lines.push(
            `  • [${issue.severity.toUpperCase()}/${issue.type}] ${issue.description}${loc}${reg}`,
          );
          if (issue.recommendation) lines.push(`    → ${issue.recommendation}`);
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

  // ---------------------------------------------------------------------------
  // Label helpers
  // ---------------------------------------------------------------------------

  private bytesLabel(bytes: number): string {
    if (bytes < 1_024) return `${bytes} B`;
    if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }

  private mimeLabel(mime: string): string {
    const map: Record<string, string> = {
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

  private statusLabel(status: DocumentStatus): string {
    const map: Record<DocumentStatus, string> = {
      [DocumentStatus.PENDING_UPLOAD]: 'Pendiente de subida',
      [DocumentStatus.UPLOADED]: 'Subido',
      [DocumentStatus.PROCESSING]: 'Procesando',
      [DocumentStatus.PROCESSED]: 'Procesado',
      [DocumentStatus.ERROR]: 'Error',
    };
    return map[status] ?? status;
  }
}
