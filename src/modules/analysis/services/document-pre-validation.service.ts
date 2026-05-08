import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IAIProvider,
  AI_PROVIDER_TOKEN,
  PreValidationResult,
} from '@providers/ai/ai-provider.interface';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '@providers/storage/file-storage.interface';
import { StorageError, StorageFileNotFoundError } from '@providers/storage/storage.errors';
import { Document } from '@modules/documents/entities/document.entity';
import { ResourceNotFoundException } from '@common/exceptions/domain.exception';
import { TextExtractorService } from './text-extractor.service';
import {
  PreValidationAIError,
  PreValidationFileError,
  PreValidationInvalidResponseError,
  PreValidationTextExtractionError,
} from '../errors/pre-validation.errors';

// ---------------------------------------------------------------------------
// System context — tells the model to emit raw JSON only.
// Keep this minimal: the domain instructions live in buildPrompt() so they
// can be versioned and tested independently of the provider.
// ---------------------------------------------------------------------------
const SYSTEM_CONTEXT =
  'Eres un revisor técnico de expedientes de obras. ' +
  'Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código. ' +
  'El JSON debe contener exactamente tres claves: ' +
  '"faltantes", "errores" y "advertencias", cada una con un array de strings.';

@Injectable()
export class DocumentPreValidationService {
  private readonly logger = new Logger(DocumentPreValidationService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly fileStorage: FileStorageService,
    @Inject(AI_PROVIDER_TOKEN)
    private readonly ai: IAIProvider,
    private readonly textExtractor: TextExtractorService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Full pre-validation pipeline for a single document.
   *
   * Flow:
   *   loadDocument → downloadFile → extractText → [empty guard]
   *   → buildPrompt → callAI → parseResponse → return
   *
   * Throws:
   *   ResourceNotFoundException         — document not found in tenant
   *   PreValidationFileError            — storage retrieval failed
   *   PreValidationTextExtractionError  — text extraction failed or empty
   *   PreValidationAIError              — AI call failed or returned nothing
   *   PreValidationInvalidResponseError — AI JSON does not match schema
   */
  async analyzeDocument(documentId: string, tenantId: string): Promise<PreValidationResult> {
    this.logger.log(`Pre-validation started — document: ${documentId}`);

    const document = await this.loadDocument(documentId, tenantId);
    const buffer = await this.downloadFile(document);
    const content = await this.extractText(buffer, document.mimeType, document.id);

    if (!content.trim()) {
      throw new PreValidationTextExtractionError(
        documentId,
        new Error('Extracted content is empty — cannot send a blank document to the AI'),
      );
    }

    const prompt = this.buildPrompt(content);
    const rawResponse = await this.callAI(prompt);
    const result = this.parseResponse(rawResponse);

    this.logger.log(
      `Pre-validation finished — document: ${documentId} | ` +
        `faltantes: ${result.faltantes.length}, ` +
        `errores: ${result.errores.length}, ` +
        `advertencias: ${result.advertencias.length}`,
    );

    return result;
  }

  // ---------------------------------------------------------------------------
  // Pipeline steps
  // ---------------------------------------------------------------------------

  private async loadDocument(documentId: string, tenantId: string): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id: documentId, tenantId } });
    if (!doc) throw new ResourceNotFoundException('Document', documentId);
    return doc;
  }

  private async downloadFile(document: Document): Promise<Buffer> {
    try {
      return await this.fileStorage.download(document.fileKey);
    } catch (error) {
      if (error instanceof StorageFileNotFoundError) {
        throw new PreValidationFileError(
          document.id,
          new Error(
            `File '${document.fileKey}' was not found in storage — ` +
              'it may have been deleted externally.',
          ),
        );
      }
      if (error instanceof StorageError) {
        throw new PreValidationFileError(document.id, error);
      }
      throw error;
    }
  }

  /**
   * Dispatches to the right extraction strategy via TextExtractorService.
   * Returns only the text string — metadata (pageCount, truncated) is an
   * internal concern of the extractor and not needed by the prompt builder.
   */
  private async extractText(
    buffer: Buffer,
    mimeType: string,
    documentId: string,
  ): Promise<string> {
    try {
      const result = await this.textExtractor.extract(buffer, mimeType);
      return result.text;
    } catch (error) {
      throw new PreValidationTextExtractionError(documentId, error);
    }
  }

  /**
   * Builds the Argentine regulatory review prompt.
   * Pure function — no side effects, easy to test and iterate on independently.
   */
  buildPrompt(contenido: string): string {
    return `
Sos un ingeniero civil especializado en aprobación de expedientes municipales en Argentina, con conocimiento de normativas como CTE, CIRSOC, IRAM, reglamentos de higiene y seguridad, y códigos de edificación municipales.

TAREA: Revisá el siguiente documento técnico e identificá problemas REALES que contenga.

INSTRUCCIONES DE ANÁLISIS:
- Leé todo el contenido del documento antes de responder
- Identificá problemas concretos presentes en el texto: datos faltantes, contradicciones, incumplimientos normativos
- Citá secciones, valores o datos específicos del documento cuando sea posible (ej: "La memoria descriptiva indica 120 m² pero el plano de planta suma 145 m²")
- Si el documento tiene poco texto o parece ilegible/escaneado, indicalo en advertencias
- No inventes información que no esté en el documento
- Si no hay problemas en una categoría, dejá el array vacío

CATEGORÍAS:
- faltantes: elementos obligatorios ausentes o que no se mencionan (planos, cálculos, firmas, visados, memorias, planillas)
- errores: datos incorrectos, contradicciones entre secciones, incumplimientos normativos concretos
- advertencias: aspectos que requieren revisión o aclaración aunque no sean errores graves

FORMATO DE RESPUESTA (solo JSON, sin texto adicional):
{
  "faltantes": ["descripción específica del elemento faltante"],
  "errores": ["descripción específica del error con referencia al contenido del documento"],
  "advertencias": ["descripción específica de la advertencia"]
}

RESTRICCIONES:
- Máximo 10 items por categoría
- Cada item debe ser una oración completa y accionable en español
- Sin texto fuera del JSON
- Sin markdown ni bloques de código
- No inventes información que no esté en el documento

DOCUMENTO A ANALIZAR:
<<<
${contenido}
>>>
`;
  }

  /**
   * Sends the prompt to the AI provider and returns the raw text response.
   * Uses chat() so the provider stays decoupled from pre-validation logic —
   * the prompt and parsing strategy live entirely in this service.
   */
  private async callAI(prompt: string): Promise<string> {
    let response: string;

    try {
      response = await this.ai.chat({
        messages: [{ role: 'user', content: prompt }],
        systemContext: SYSTEM_CONTEXT,
      });
    } catch (error) {
      throw new PreValidationAIError(error);
    }

    if (!response?.trim()) {
      throw new PreValidationAIError(new Error('AI returned an empty response'));
    }

    return response;
  }

  /**
   * Parses and validates the raw AI response.
   * Handles two common deviations from "raw JSON only" instructions:
   *   1. JSON wrapped in a markdown code fence (```json ... ```)
   *   2. JSON preceded or followed by explanatory text ({ ... })
   */
  parseResponse(response: string): PreValidationResult {
    const jsonString = this.extractJsonBlock(response);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new PreValidationInvalidResponseError(
        `Response is not valid JSON. Received: "${response.slice(0, 300)}"`,
      );
    }

    return this.validateResult(parsed);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Extracts the JSON block from the AI response, handling the two most
   * common wrapping patterns before falling back to the raw string.
   */
  private extractJsonBlock(text: string): string {
    // Pattern 1: ```json\n{ ... }\n```  or  ```\n{ ... }\n```
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch?.[1]) return fenceMatch[1].trim();

    // Pattern 2: explanatory text before/after the JSON object
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) return text.slice(start, end + 1);

    return text.trim();
  }

  /**
   * Validates that the parsed object conforms to PreValidationResult.
   * Checks every field and every element to catch partial or malformed responses
   * before they propagate as silent data corruption.
   */
  private validateResult(raw: unknown): PreValidationResult {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new PreValidationInvalidResponseError(
        `Expected an object, got ${Array.isArray(raw) ? 'array' : typeof raw}`,
      );
    }

    const payload = raw as Record<string, unknown>;
    const fields = ['faltantes', 'errores', 'advertencias'] as const;

    for (const field of fields) {
      const value = payload[field];

      if (!Array.isArray(value)) {
        throw new PreValidationInvalidResponseError(
          `Field '${field}' must be an array, got ${typeof value}`,
        );
      }

      const badIndex = value.findIndex((item) => typeof item !== 'string');
      if (badIndex !== -1) {
        throw new PreValidationInvalidResponseError(
          `Field '${field}[${badIndex}]' must be a string, got ${typeof value[badIndex]}`,
        );
      }
    }

    return {
      faltantes: payload['faltantes'] as string[],
      errores: payload['errores'] as string[],
      advertencias: payload['advertencias'] as string[],
    };
  }
}
