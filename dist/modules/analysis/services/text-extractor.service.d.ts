import { TextExtractionResult } from '../interfaces/text-extraction.interface';
export declare class TextExtractorService {
    private readonly logger;
    extract(buffer: Buffer, mimeType: string): Promise<TextExtractionResult>;
    private fromPdf;
    private fromImage;
    private fromDocx;
    private fromPlainText;
    private finalize;
}
