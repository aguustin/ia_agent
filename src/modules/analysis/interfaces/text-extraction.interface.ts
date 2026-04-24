export type TextExtractionMethod =
  | 'pdf-parse'
  | 'image-placeholder'
  | 'utf8'
  | 'utf8-fallback';

export interface TextExtractionResult {
  /** Extracted text, possibly truncated to MAX_CHARS */
  text: string;
  /** Page count reported by the source format; 0 when unknown */
  pageCount: number;
  /** True when content was cut off to stay within token limits */
  truncated: boolean;
  /** Extraction strategy that was applied */
  method: TextExtractionMethod;
}
