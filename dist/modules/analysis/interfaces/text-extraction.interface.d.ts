export type TextExtractionMethod = 'pdf-parse' | 'image-placeholder' | 'utf8' | 'utf8-fallback';
export interface TextExtractionResult {
    text: string;
    pageCount: number;
    truncated: boolean;
    method: TextExtractionMethod;
}
