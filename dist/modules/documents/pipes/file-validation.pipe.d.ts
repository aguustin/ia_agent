import { PipeTransform } from '@nestjs/common';
export declare class FileValidationPipe implements PipeTransform<Express.Multer.File> {
    transform(file: Express.Multer.File | undefined): Express.Multer.File;
}
