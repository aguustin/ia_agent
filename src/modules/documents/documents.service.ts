import { Injectable, Inject, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus, DocumentType } from './entities/document.entity';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { PaginationDto, paginate, PaginatedResult } from '@common/dto/pagination.dto';
import { ResourceNotFoundException } from '@common/exceptions/domain.exception';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { FILE_STORAGE_SERVICE, FileStorageService } from '@providers/storage/file-storage.interface';
import {
  StorageError,
  StorageInvalidCredentialsError,
  StorageTimeoutError,
  StorageFileNotFoundError,
} from '@providers/storage/storage.errors';
import { ProjectsService } from '@modules/projects/projects.service';

export interface DocumentUploadResult {
  document: Document;
  url: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly fileStorage: FileStorageService,
    private readonly projectsService: ProjectsService,
  ) {}

  async upload(
    projectId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    actor: AuthenticatedUser,
  ): Promise<DocumentUploadResult> {
    await this.projectsService.findById(projectId, actor.tenantId);

    const documentId = await this.reserveDocumentRecord(
      projectId,
      file,
      dto.documentType ?? DocumentType.OTHER,
      actor,
    );

    const key = this.fileStorage.buildKey({
      tenantId: actor.tenantId,
      projectId,
      documentId,
      fileName: file.originalname,
    });

    let storedKey: string;
    try {
      storedKey = await this.fileStorage.upload(file.buffer, key, {
        contentType: file.mimetype,
        metadata: {
          tenantId: actor.tenantId,
          projectId,
          documentId,
          uploadedBy: actor.id,
        },
      });
    } catch (error) {
      await this.documentRepo.delete(documentId);
      throw this.mapStorageError(error, 'upload');
    }

    const document = await this.documentRepo.save(
      Object.assign(await this.documentRepo.findOneOrFail({ where: { id: documentId } }), {
        fileKey: storedKey,
        fileSizeBytes: file.size,
        status: DocumentStatus.UPLOADED,
      }),
    );

    const url = await this.fileStorage.getSignedUrl(storedKey);

    this.logger.log(
      `Document ${document.id} uploaded — project: ${projectId}, size: ${file.size}B`,
    );

    return { document, url };
  }

  async findAll(
    projectId: string,
    tenantId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Document>> {
    await this.projectsService.findById(projectId, tenantId);

    const [data, total] = await this.documentRepo.findAndCount({
      where: { projectId, tenantId },
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return paginate(data, total, pagination);
  }

  async findById(id: string, projectId: string, tenantId: string): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id, projectId, tenantId } });
    if (!doc) throw new ResourceNotFoundException('Document', id);
    return doc;
  }

  async getSignedDownloadUrl(id: string, projectId: string, tenantId: string): Promise<string> {
    const doc = await this.findById(id, projectId, tenantId);

    try {
      return await this.fileStorage.getSignedUrl(doc.fileKey, { expiresInSeconds: 900 });
    } catch (error) {
      throw this.mapStorageError(error, 'getSignedUrl');
    }
  }

  async remove(id: string, projectId: string, actor: AuthenticatedUser): Promise<void> {
    const doc = await this.findById(id, projectId, actor.tenantId);

    await this.fileStorage.delete(doc.fileKey).catch((error) => {
      this.logger.warn(
        `Non-fatal: failed to delete stored file '${doc.fileKey}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    await this.documentRepo.remove(doc);
    this.logger.log(`Document ${id} removed from project ${projectId}`);
  }

  async updateStatus(id: string, status: DocumentStatus): Promise<void> {
    await this.documentRepo.update(id, { status });
  }

  private async reserveDocumentRecord(
    projectId: string,
    file: Express.Multer.File,
    documentType: DocumentType,
    actor: AuthenticatedUser,
  ): Promise<string> {
    const document = this.documentRepo.create({
      name: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: 0,
      documentType,
      status: DocumentStatus.PENDING_UPLOAD,
      projectId,
      uploadedById: actor.id,
      tenantId: actor.tenantId,
      fileKey: 'pending',
    });

    const saved = await this.documentRepo.save(document);
    return saved.id;
  }

  private mapStorageError(error: unknown, operation: string): Error {
    if (error instanceof StorageInvalidCredentialsError) {
      this.logger.error(`Storage credentials rejected during '${operation}'`);
      return new InternalServerErrorException(
        'Storage service is not properly configured. Contact an administrator.',
      );
    }

    if (error instanceof StorageTimeoutError) {
      this.logger.error(`Storage timeout during '${operation}': ${(error as Error).message}`);
      return new InternalServerErrorException(
        'Storage service timed out. Please retry in a moment.',
      );
    }

    if (error instanceof StorageFileNotFoundError) {
      return new ResourceNotFoundException('File in storage');
    }

    if (error instanceof StorageError) {
      this.logger.error(`Storage error during '${operation}': ${(error as Error).message}`);
      return new InternalServerErrorException('Storage operation failed. Please try again.');
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}
