import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DocumentType } from '../entities/document.entity';

/**
 * Metadata sent as form fields alongside the multipart file.
 * The file itself arrives via the "file" field.
 */
export class UploadDocumentDto {
  @ApiPropertyOptional({
    enum: DocumentType,
    default: DocumentType.OTHER,
    description: 'Classification of the document within the project',
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;
}
