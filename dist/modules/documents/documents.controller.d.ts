import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    upload(projectId: string, file: Express.Multer.File, dto: UploadDocumentDto, user: AuthenticatedUser): Promise<import("./documents.service").DocumentUploadResult>;
    findAll(projectId: string, pagination: PaginationDto, user: AuthenticatedUser): Promise<import("@common/dto/pagination.dto").PaginatedResult<import("./entities/document.entity").Document>>;
    findOne(projectId: string, id: string, user: AuthenticatedUser): Promise<import("./entities/document.entity").Document>;
    getDownloadUrl(projectId: string, id: string, user: AuthenticatedUser): Promise<string>;
    remove(projectId: string, id: string, user: AuthenticatedUser): Promise<void>;
}
