import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentPreValidationService } from './document-pre-validation.service';
import { TextExtractorService } from './text-extractor.service';
import { Document, DocumentStatus, DocumentType } from '@modules/documents/entities/document.entity';
import { AI_PROVIDER_TOKEN } from '@providers/ai/ai-provider.interface';
import { FILE_STORAGE_SERVICE } from '@providers/storage/file-storage.interface';
import { StorageFileNotFoundError, StorageError } from '@providers/storage/storage.errors';
import { ResourceNotFoundException } from '@common/exceptions/domain.exception';
import {
  PreValidationAIError,
  PreValidationFileError,
  PreValidationInvalidResponseError,
  PreValidationTextExtractionError,
} from '../errors/pre-validation.errors';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DOC_ID = 'doc-aaa';
const TENANT_ID = 'tenant-bbb';
const FILE_KEY = 'tenants/tenant-bbb/projects/proj/documents/doc-aaa/plano.pdf';
const FILE_BUFFER = Buffer.from('PDF bytes');
const EXTRACTED_TEXT = 'Contenido del documento: plano de planta baja.';

const VALID_AI_RESPONSE = JSON.stringify({
  faltantes: ['Plano de situación', 'Memoria descriptiva'],
  errores: ['Firma del arquitecto ausente'],
  advertencias: ['Escala no indicada en plano de planta'],
});

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: DOC_ID,
    name: 'plano.pdf',
    originalName: 'plano.pdf',
    fileKey: FILE_KEY,
    mimeType: 'application/pdf',
    fileSizeBytes: 1024,
    status: DocumentStatus.UPLOADED,
    documentType: DocumentType.ARCHITECTURAL,
    projectId: 'proj-ccc',
    uploadedById: 'user-ddd',
    tenantId: TENANT_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: null as any,
    uploadedBy: null as any,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('DocumentPreValidationService', () => {
  let service: DocumentPreValidationService;

  let documentRepo: jest.Mocked<Record<string, jest.Mock>>;
  let fileStorage: jest.Mocked<Record<string, jest.Mock>>;
  let aiProvider: jest.Mocked<Record<string, jest.Mock>>;
  let textExtractor: jest.Mocked<Record<string, jest.Mock>>;

  beforeEach(async () => {
    documentRepo = { findOne: jest.fn().mockResolvedValue(makeDocument()) };

    fileStorage = { download: jest.fn().mockResolvedValue(FILE_BUFFER) };

    aiProvider = { chat: jest.fn().mockResolvedValue(VALID_AI_RESPONSE) };

    textExtractor = {
      extract: jest.fn().mockResolvedValue({
        text: EXTRACTED_TEXT,
        pageCount: 5,
        truncated: false,
        method: 'pdf-parse',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentPreValidationService,
        { provide: getRepositoryToken(Document), useValue: documentRepo },
        { provide: FILE_STORAGE_SERVICE, useValue: fileStorage },
        { provide: AI_PROVIDER_TOKEN, useValue: aiProvider },
        { provide: TextExtractorService, useValue: textExtractor },
      ],
    }).compile();

    service = module.get(DocumentPreValidationService);
  });

  // -------------------------------------------------------------------------
  // analyzeDocument — success path
  // -------------------------------------------------------------------------

  describe('analyzeDocument — success', () => {
    it('runs the full pipeline and returns a validated result', async () => {
      const result = await service.analyzeDocument(DOC_ID, TENANT_ID);

      expect(documentRepo.findOne).toHaveBeenCalledWith({
        where: { id: DOC_ID, tenantId: TENANT_ID },
      });
      expect(fileStorage.download).toHaveBeenCalledWith(FILE_KEY);
      expect(textExtractor.extract).toHaveBeenCalledWith(FILE_BUFFER, 'application/pdf');
      expect(aiProvider.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [expect.objectContaining({ role: 'user' })],
          systemContext: expect.any(String),
        }),
      );
      expect(result).toEqual({
        faltantes: ['Plano de situación', 'Memoria descriptiva'],
        errores: ['Firma del arquitecto ausente'],
        advertencias: ['Escala no indicada en plano de planta'],
      });
    });

    it('passes the extracted document content to the AI via the chat message', async () => {
      await service.analyzeDocument(DOC_ID, TENANT_ID);

      const [chatRequest] = aiProvider.chat.mock.calls[0];
      expect(chatRequest.messages[0].content).toContain(EXTRACTED_TEXT);
    });

    it('returns empty arrays when AI reports no issues', async () => {
      aiProvider.chat.mockResolvedValue(
        JSON.stringify({ faltantes: [], errores: [], advertencias: [] }),
      );

      const result = await service.analyzeDocument(DOC_ID, TENANT_ID);

      expect(result.faltantes).toHaveLength(0);
      expect(result.errores).toHaveLength(0);
      expect(result.advertencias).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // loadDocument
  // -------------------------------------------------------------------------

  describe('analyzeDocument — document not found', () => {
    it('throws ResourceNotFoundException when document does not exist for tenant', async () => {
      documentRepo.findOne.mockResolvedValue(null);

      await expect(service.analyzeDocument(DOC_ID, TENANT_ID)).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(fileStorage.download).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // downloadFile
  // -------------------------------------------------------------------------

  describe('analyzeDocument — storage failures', () => {
    it('throws PreValidationFileError when file is not found in storage', async () => {
      fileStorage.download.mockRejectedValue(new StorageFileNotFoundError(FILE_KEY));

      await expect(service.analyzeDocument(DOC_ID, TENANT_ID)).rejects.toThrow(
        PreValidationFileError,
      );
    });

    it('throws PreValidationFileError for any StorageError', async () => {
      fileStorage.download.mockRejectedValue(new StorageError('connection reset'));

      await expect(service.analyzeDocument(DOC_ID, TENANT_ID)).rejects.toThrow(
        PreValidationFileError,
      );
    });

    it('rethrows non-storage errors from download unchanged', async () => {
      const unexpected = new TypeError('unexpected');
      fileStorage.download.mockRejectedValue(unexpected);

      await expect(service.analyzeDocument(DOC_ID, TENANT_ID)).rejects.toThrow(TypeError);
    });
  });

  // -------------------------------------------------------------------------
  // extractText
  // -------------------------------------------------------------------------

  describe('analyzeDocument — text extraction failures', () => {
    it('throws PreValidationTextExtractionError when extractor throws', async () => {
      textExtractor.extract.mockRejectedValue(new Error('Corrupt PDF'));

      await expect(service.analyzeDocument(DOC_ID, TENANT_ID)).rejects.toThrow(
        PreValidationTextExtractionError,
      );
    });

    it('throws PreValidationTextExtractionError when extracted content is empty', async () => {
      textExtractor.extract.mockResolvedValue({
        text: '   ',
        pageCount: 0,
        truncated: false,
        method: 'pdf-parse',
      });

      await expect(service.analyzeDocument(DOC_ID, TENANT_ID)).rejects.toThrow(
        PreValidationTextExtractionError,
      );
      expect(aiProvider.chat).not.toHaveBeenCalled();
    });

    it('throws PreValidationTextExtractionError when extracted content is empty string', async () => {
      textExtractor.extract.mockResolvedValue({
        text: '',
        pageCount: 0,
        truncated: false,
        method: 'utf8',
      });

      await expect(service.analyzeDocument(DOC_ID, TENANT_ID)).rejects.toThrow(
        PreValidationTextExtractionError,
      );
    });
  });

  // -------------------------------------------------------------------------
  // callAI
  // -------------------------------------------------------------------------

  describe('analyzeDocument — AI failures', () => {
    it('throws PreValidationAIError when the AI provider throws', async () => {
      aiProvider.chat.mockRejectedValue(new Error('OpenAI rate limit'));

      await expect(service.analyzeDocument(DOC_ID, TENANT_ID)).rejects.toThrow(
        PreValidationAIError,
      );
    });

    it('throws PreValidationAIError when the AI returns an empty string', async () => {
      aiProvider.chat.mockResolvedValue('');

      await expect(service.analyzeDocument(DOC_ID, TENANT_ID)).rejects.toThrow(
        PreValidationAIError,
      );
    });

    it('throws PreValidationAIError when the AI returns only whitespace', async () => {
      aiProvider.chat.mockResolvedValue('   \n  ');

      await expect(service.analyzeDocument(DOC_ID, TENANT_ID)).rejects.toThrow(
        PreValidationAIError,
      );
    });
  });

  // -------------------------------------------------------------------------
  // parseResponse — valid formats
  // -------------------------------------------------------------------------

  describe('parseResponse — accepts valid AI response formats', () => {
    it('parses a clean JSON string', () => {
      const result = service.parseResponse(VALID_AI_RESPONSE);
      expect(result.faltantes).toContain('Plano de situación');
    });

    it('extracts JSON from a markdown code fence (```json ... ```)', () => {
      const wrapped = `\`\`\`json\n${VALID_AI_RESPONSE}\n\`\`\``;
      const result = service.parseResponse(wrapped);
      expect(result.faltantes).toContain('Plano de situación');
    });

    it('extracts JSON from a plain code fence (``` ... ```)', () => {
      const wrapped = `\`\`\`\n${VALID_AI_RESPONSE}\n\`\`\``;
      const result = service.parseResponse(wrapped);
      expect(result.errores).toContain('Firma del arquitecto ausente');
    });

    it('extracts JSON when preceded by explanatory text', () => {
      const withPreamble = `Aquí está el análisis del documento:\n\n${VALID_AI_RESPONSE}\n\nEspero que sea útil.`;
      const result = service.parseResponse(withPreamble);
      expect(result.advertencias).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // parseResponse — invalid formats
  // -------------------------------------------------------------------------

  describe('parseResponse — rejects invalid AI responses', () => {
    it('throws PreValidationInvalidResponseError for non-JSON text', () => {
      expect(() => service.parseResponse('No se puede analizar este documento.')).toThrow(
        PreValidationInvalidResponseError,
      );
    });

    it('throws PreValidationInvalidResponseError when response is a JSON array', () => {
      expect(() => service.parseResponse('["faltante1", "faltante2"]')).toThrow(
        PreValidationInvalidResponseError,
      );
    });

    it('throws PreValidationInvalidResponseError when a required field is missing', () => {
      const missingField = JSON.stringify({ faltantes: [], errores: [] }); // no advertencias
      expect(() => service.parseResponse(missingField)).toThrow(PreValidationInvalidResponseError);
    });

    it('throws PreValidationInvalidResponseError when a field is not an array', () => {
      const wrongType = JSON.stringify({
        faltantes: 'falta plano',  // string instead of array
        errores: [],
        advertencias: [],
      });
      expect(() => service.parseResponse(wrongType)).toThrow(PreValidationInvalidResponseError);
    });

    it('throws PreValidationInvalidResponseError when an array contains non-string elements', () => {
      const wrongElement = JSON.stringify({
        faltantes: [{ item: 'Plano de situación' }], // object instead of string
        errores: [],
        advertencias: [],
      });
      expect(() => service.parseResponse(wrongElement)).toThrow(PreValidationInvalidResponseError);
    });
  });

  // -------------------------------------------------------------------------
  // buildPrompt
  // -------------------------------------------------------------------------

  describe('buildPrompt', () => {
    it('includes the document content in the prompt', () => {
      const content = 'Texto del expediente de obras.';
      const prompt = service.buildPrompt(content);
      expect(prompt).toContain(content);
    });

    it('mentions the three required JSON fields', () => {
      const prompt = service.buildPrompt('contenido');
      expect(prompt).toContain('faltantes');
      expect(prompt).toContain('errores');
      expect(prompt).toContain('advertencias');
    });

    it('instructs the model not to invent information', () => {
      const prompt = service.buildPrompt('contenido');
      expect(prompt).toContain('No inventes información');
    });

    it('returns a non-empty string for any non-empty content', () => {
      expect(service.buildPrompt('x').length).toBeGreaterThan(0);
    });
  });
});
