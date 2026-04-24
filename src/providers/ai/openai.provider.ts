import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  IAIProvider,
  DocumentAnalysisRequest,
  DocumentAnalysisResult,
  PreValidationRequest,
  PreValidationResult,
  ChatRequest,
  IssueSeverity,
  IssueType,
  AnalysisIssueResult,
} from './ai-provider.interface';

const PRE_VALIDATION_SYSTEM_PROMPT = `Eres un experto en revisión de documentación de proyectos de construcción en España, con conocimiento profundo de:
- CTE (Código Técnico de la Edificación): DB-SE, DB-SI, DB-SUA, DB-HE, DB-HR, DB-HS, DB-AE
- LOE (Ley de Ordenación de la Edificación)
- PGOU (Plan General de Ordenación Urbana) y normativa municipal de licencias de obras

Tu tarea es realizar una PRE-VALIDACIÓN del documento. Clasifica los hallazgos en tres categorías:
- FALTANTES: elementos obligatorios ausentes o incompletos (planos, cálculos, memorias, visados, firmas, sellos, anexos, etc.)
- ERRORES: incumplimientos normativos concretos, datos incorrectos o contradictorios entre secciones
- ADVERTENCIAS: aspectos que requieren atención o aclaración, aunque no sean errores graves

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "faltantes": ["descripción clara y concisa del elemento faltante, con referencia normativa si aplica"],
  "errores": ["descripción del error, indicando artículo/norma incumplida y ubicación en el documento"],
  "advertencias": ["descripción de la advertencia con recomendación de acción"]
}

Reglas:
- Cada ítem debe ser una cadena en español, autocontenida y accionable.
- Referencia normativa cuando sea posible: "CTE DB-SI artículo 3.2", "LOE art. 12.3", etc.
- Si el documento es una imagen sin texto extraíble, lista los requisitos genéricos para ese tipo documental.
- Los arrays pueden estar vacíos [] si no hay hallazgos en esa categoría.
- No incluyas campos adicionales fuera del schema.`;

const ANALYSIS_SYSTEM_PROMPT = `You are an expert in construction project documentation review and regulatory compliance for building permits in Spain (CTE, LOE, PGOU, and municipal regulations).

Your task is to analyze construction project documents and identify:
1. Regulatory compliance issues (CTE DB-SE, DB-SI, DB-SUA, DB-HE, DB-HR, DB-HS, DB-AE)
2. Documentation completeness (required plans, specifications, calculations)
3. Technical deficiencies (structural, architectural, MEP)
4. Safety requirements (fire safety, accessibility, evacuation)
5. Environmental impact considerations

Respond ONLY with a valid JSON object in this exact schema:
{
  "summary": "string",
  "complianceScore": number (0-100),
  "issues": [
    {
      "type": "compliance|completeness|technical|safety|environmental",
      "severity": "critical|high|medium|low|info",
      "description": "string",
      "location": "string (optional - page/section reference)",
      "recommendation": "string",
      "regulation": "string (optional - applicable regulation)"
    }
  ],
  "recommendations": ["string"]
}`;

@Injectable()
export class OpenAIProvider implements IAIProvider, OnModuleInit {
  private readonly logger = new Logger(OpenAIProvider.name);
  private client: OpenAI;
  private model: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.model = this.config.get<string>('OPENAI_MODEL', 'gpt-4o');
    this.logger.log(`OpenAI provider initialized with model: ${this.model}`);
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResult> {
    const maxTokens = this.config.get<number>('OPENAI_MAX_TOKENS', 4096);

    const userPrompt = `
Project: ${request.projectName}
${request.projectDescription ? `Description: ${request.projectDescription}` : ''}
Document: ${request.documentName} (${request.documentType})

--- DOCUMENT CONTENT ---
${request.documentContent.slice(0, 60000)}
--- END OF DOCUMENT ---

Analyze this construction document for pre-validation purposes.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenAI returned empty response for document analysis');
    }

    const parsed = JSON.parse(rawContent) as {
      summary: string;
      complianceScore: number;
      issues: Array<{
        type: string;
        severity: string;
        description: string;
        location?: string;
        recommendation: string;
        regulation?: string;
      }>;
      recommendations: string[];
    };

    const issues: AnalysisIssueResult[] = (parsed.issues ?? []).map((issue) => ({
      type: (issue.type ?? IssueType.TECHNICAL) as IssueType,
      severity: (issue.severity ?? IssueSeverity.MEDIUM) as IssueSeverity,
      description: issue.description,
      location: issue.location,
      recommendation: issue.recommendation,
      regulation: issue.regulation,
    }));

    return {
      summary: parsed.summary ?? '',
      complianceScore: Math.min(100, Math.max(0, parsed.complianceScore ?? 0)),
      issues,
      recommendations: parsed.recommendations ?? [],
      metadata: {
        pagesAnalyzed: 0,
        analysisVersion: '1.0',
        model: response.model,
      },
    };
  }

  async preValidateDocument(request: PreValidationRequest): Promise<PreValidationResult> {
    const maxTokens = this.config.get<number>('OPENAI_MAX_TOKENS', 4096);

    const lines: string[] = [
      `Documento: ${request.documentName}`,
      `Tipo: ${request.documentType}`,
    ];
    if (request.pageCount > 0) lines.push(`Páginas: ${request.pageCount}`);
    if (request.contentTruncated) {
      lines.push(
        `[AVISO: El contenido fue truncado a ${request.documentContent.length} caracteres ` +
          'por exceder el límite de procesamiento. Es posible que falten secciones finales.]',
      );
    }
    lines.push('', '--- CONTENIDO DEL DOCUMENTO ---', request.documentContent, '--- FIN ---', '');
    lines.push('Realiza la pre-validación de este documento.');

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PRE_VALIDATION_SYSTEM_PROMPT },
        { role: 'user', content: lines.join('\n') },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenAI returned an empty response for pre-validation');
    }

    // JSON.parse throws SyntaxError on invalid JSON — callers wrap in PreValidationAIError.
    return JSON.parse(rawContent) as PreValidationResult;
  }

  async chat(request: ChatRequest): Promise<string> {
    const maxTokens = request.maxTokens ?? this.config.get<number>('OPENAI_MAX_TOKENS', 2048);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: 'system', content: request.systemContext },
        ...request.messages,
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  }

  async *chatStream(request: ChatRequest): AsyncIterable<string> {
    const maxTokens = request.maxTokens ?? this.config.get<number>('OPENAI_MAX_TOKENS', 2048);

    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
      messages: [
        { role: 'system', content: request.systemContext },
        ...request.messages,
      ],
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}
