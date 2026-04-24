"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DocumentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const document_entity_1 = require("./entities/document.entity");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const domain_exception_1 = require("../../common/exceptions/domain.exception");
const file_storage_interface_1 = require("../../providers/storage/file-storage.interface");
const storage_errors_1 = require("../../providers/storage/storage.errors");
const projects_service_1 = require("../projects/projects.service");
let DocumentsService = DocumentsService_1 = class DocumentsService {
    constructor(documentRepo, fileStorage, projectsService) {
        this.documentRepo = documentRepo;
        this.fileStorage = fileStorage;
        this.projectsService = projectsService;
        this.logger = new common_1.Logger(DocumentsService_1.name);
    }
    async upload(projectId, file, dto, actor) {
        await this.projectsService.findById(projectId, actor.tenantId);
        const documentId = await this.reserveDocumentRecord(projectId, file, dto.documentType ?? document_entity_1.DocumentType.OTHER, actor);
        const key = this.fileStorage.buildKey({
            tenantId: actor.tenantId,
            projectId,
            documentId,
            fileName: file.originalname,
        });
        let storedKey;
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
        }
        catch (error) {
            await this.documentRepo.delete(documentId);
            throw this.mapStorageError(error, 'upload');
        }
        const document = await this.documentRepo.save(Object.assign(await this.documentRepo.findOneOrFail({ where: { id: documentId } }), {
            fileKey: storedKey,
            fileSizeBytes: file.size,
            status: document_entity_1.DocumentStatus.UPLOADED,
        }));
        const url = await this.fileStorage.getSignedUrl(storedKey);
        this.logger.log(`Document ${document.id} uploaded — project: ${projectId}, size: ${file.size}B`);
        return { document, url };
    }
    async findAll(projectId, tenantId, pagination) {
        await this.projectsService.findById(projectId, tenantId);
        const [data, total] = await this.documentRepo.findAndCount({
            where: { projectId, tenantId },
            order: { createdAt: 'DESC' },
            skip: pagination.skip,
            take: pagination.limit,
        });
        return (0, pagination_dto_1.paginate)(data, total, pagination);
    }
    async findById(id, projectId, tenantId) {
        const doc = await this.documentRepo.findOne({ where: { id, projectId, tenantId } });
        if (!doc)
            throw new domain_exception_1.ResourceNotFoundException('Document', id);
        return doc;
    }
    async getSignedDownloadUrl(id, projectId, tenantId) {
        const doc = await this.findById(id, projectId, tenantId);
        try {
            return await this.fileStorage.getSignedUrl(doc.fileKey, { expiresInSeconds: 900 });
        }
        catch (error) {
            throw this.mapStorageError(error, 'getSignedUrl');
        }
    }
    async remove(id, projectId, actor) {
        const doc = await this.findById(id, projectId, actor.tenantId);
        await this.fileStorage.delete(doc.fileKey).catch((error) => {
            this.logger.warn(`Non-fatal: failed to delete stored file '${doc.fileKey}': ${error instanceof Error ? error.message : String(error)}`);
        });
        await this.documentRepo.remove(doc);
        this.logger.log(`Document ${id} removed from project ${projectId}`);
    }
    async updateStatus(id, status) {
        await this.documentRepo.update(id, { status });
    }
    async reserveDocumentRecord(projectId, file, documentType, actor) {
        const document = this.documentRepo.create({
            name: file.originalname,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSizeBytes: 0,
            documentType,
            status: document_entity_1.DocumentStatus.PENDING_UPLOAD,
            projectId,
            uploadedById: actor.id,
            tenantId: actor.tenantId,
            fileKey: 'pending',
        });
        const saved = await this.documentRepo.save(document);
        return saved.id;
    }
    mapStorageError(error, operation) {
        if (error instanceof storage_errors_1.StorageInvalidCredentialsError) {
            this.logger.error(`Storage credentials rejected during '${operation}'`);
            return new common_1.InternalServerErrorException('Storage service is not properly configured. Contact an administrator.');
        }
        if (error instanceof storage_errors_1.StorageTimeoutError) {
            this.logger.error(`Storage timeout during '${operation}': ${error.message}`);
            return new common_1.InternalServerErrorException('Storage service timed out. Please retry in a moment.');
        }
        if (error instanceof storage_errors_1.StorageFileNotFoundError) {
            return new domain_exception_1.ResourceNotFoundException('File in storage');
        }
        if (error instanceof storage_errors_1.StorageError) {
            this.logger.error(`Storage error during '${operation}': ${error.message}`);
            return new common_1.InternalServerErrorException('Storage operation failed. Please try again.');
        }
        return error instanceof Error ? error : new Error(String(error));
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = DocumentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(document_entity_1.Document)),
    __param(1, (0, common_1.Inject)(file_storage_interface_1.FILE_STORAGE_SERVICE)),
    __metadata("design:paramtypes", [typeorm_2.Repository, Object, projects_service_1.ProjectsService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map