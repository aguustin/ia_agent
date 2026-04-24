import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES } from '../entities/document.entity';

/**
 * Validates the uploaded file before it reaches the service layer.
 * Applied at the controller parameter level on @UploadedFile().
 */
@Injectable()
export class FileValidationPipe implements PipeTransform<Express.Multer.File> {
  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No file provided. Send a multipart/form-data request with field name "file".');
    }

    if (!isAllowedMimeType(file.mimetype)) {
      throw new BadRequestException(
        `File type '${file.mimetype}' is not allowed. ` +
          'Accepted types: PDF, DOCX, DOC, JPEG, PNG, TIFF, XLSX.',
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = Math.round(file.size / (1024 * 1024));
      throw new BadRequestException(
        `File size ${sizeMb}MB exceeds the maximum allowed size of 100MB.`,
      );
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    return file;
  }
}
