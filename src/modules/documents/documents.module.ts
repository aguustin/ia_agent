import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { ProjectsModule } from '@modules/projects/projects.module';

@Module({
  imports: [TypeOrmModule.forFeature([Document]), ProjectsModule],
  providers: [DocumentsService, FileValidationPipe],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
