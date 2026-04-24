import { Repository } from 'typeorm';
import { Document, DocumentStatus } from './entities/document.entity';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { PaginationDto, PaginatedResult } from '@common/dto/pagination.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { FileStorageService } from '@providers/storage/file-storage.interface';
import { ProjectsService } from '@modules/projects/projects.service';
export interface DocumentUploadResult {
    document: Document;
    url: string;
}
export declare class DocumentsService {
    private readonly documentRepo;
    private readonly fileStorage;
    private readonly projectsService;
    private readonly logger;
    constructor(documentRepo: Repository<Document>, fileStorage: FileStorageService, projectsService: ProjectsService);
    upload(projectId: string, file: Express.Multer.File, dto: UploadDocumentDto, actor: AuthenticatedUser): Promise<DocumentUploadResult>;
    findAll(projectId: string, tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<Document>>;
    findById(id: string, projectId: string, tenantId: string): Promise<Document>;
    getSignedDownloadUrl(id: string, projectId: string, tenantId: string): Promise<string>;
    remove(id: string, projectId: string, actor: AuthenticatedUser): Promise<void>;
    updateStatus(id: string, status: DocumentStatus): Promise<void>;
    private reserveDocumentRecord;
    private mapStorageError;
}
