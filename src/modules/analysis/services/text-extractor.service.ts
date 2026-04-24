import { Injectable, Logger } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import {
  TextExtractionMethod,
  TextExtractionResult,
} from '../interfaces/text-extraction.interface';

/**
 * Max characters forwarded to the LLM.
 * ~80 k chars ≈ 20 k tokens — safe for GPT-4o's 128 k context while leaving
 * room for the system prompt and the model's response.
 */
const MAX_CHARS = 80_000;

@Injectable()
export class TextExtractorService {
  private readonly logger = new Logger(TextExtractorService.name);

  /**
   * Dispatch to the right extraction strategy based on MIME type.
   * Never throws for unsupported types — falls back to UTF-8.
   */
  async extract(buffer: Buffer, mimeType: string): Promise<TextExtractionResult> {
    if (mimeType === 'application/pdf') return this.fromPdf(buffer);
    if (mimeType.startsWith('image/')) return this.fromImage(mimeType);
    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return this.fromDocx(buffer);
    }
    return this.fromPlainText(buffer);
  }

  // ---------------------------------------------------------------------------
  // Extraction strategies
  // ---------------------------------------------------------------------------

  private async fromPdf(buffer: Buffer): Promise<TextExtractionResult> {
    const data = await pdfParse(buffer);
    return this.finalize(data.text ?? '', data.numpages ?? 0, 'pdf-parse');
  }

  private fromImage(mimeType: string): TextExtractionResult {
    // No OCR dependency — return a structured placeholder so the LLM knows it
    // is dealing with an image and can produce generic regulatory requirements.
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

  private fromDocx(buffer: Buffer): TextExtractionResult {
    // Lossy plain-text pass: strips non-printable bytes, keeps ASCII + Latin-1
    // Extended. For high-fidelity DOCX extraction add the `mammoth` package.
    const raw = buffer
      .toString('utf-8')
      .replace(/[^\x20-\x7E\n\r\tÀ-ſ]/g, ' ')
      .replace(/ {2,}/g, ' ')
      .trim();
    return this.finalize(raw, 0, 'utf8-fallback');
  }

  private fromPlainText(buffer: Buffer): TextExtractionResult {
    return this.finalize(buffer.toString('utf-8'), 0, 'utf8');
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  private finalize(
    raw: string,
    pageCount: number,
    method: TextExtractionMethod,
  ): TextExtractionResult {
    const truncated = raw.length > MAX_CHARS;
    if (truncated) {
      this.logger.warn(
        `Content truncated for LLM: ${raw.length} → ${MAX_CHARS} chars (method: ${method})`,
      );
    }
    return {
      text: truncated ? raw.slice(0, MAX_CHARS) : raw,
      pageCount,
      truncated,
      method,
    };
  }
}
