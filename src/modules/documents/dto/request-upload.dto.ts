import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DocumentType } from '../entities/document.entity';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export class RequestUploadDto {
  @ApiProperty({ example: 'memoria_descriptiva.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: 'application/pdf', enum: ALLOWED_MIME_TYPES })
  @IsString()
  @IsIn(ALLOWED_MIME_TYPES)
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes', maximum: 104857600 })
  @IsNumber()
  @Min(1)
  @Max(104857600)
  fileSizeBytes: number;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;
}
