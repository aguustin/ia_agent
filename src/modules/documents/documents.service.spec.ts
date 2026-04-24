import 'multer';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document, DocumentStatus, DocumentType } from './entities/document.entity';
import { FILE_STORAGE_SERVICE } from '@providers/storage/file-storage.interface';
import { ProjectsService } from '@modules/projects/projects.service';
import { ResourceNotFoundException } from '@common/exceptions/domain.exception';
import {
  StorageError,
  StorageTimeoutError,
  StorageInvalidCredentialsError,
  StorageFileNotFoundError,
} from '@providers/storage/storage.errors';
import { PaginationDto } from '@common/dto/pagination.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-aaa';
const PROJECT_ID = 'proj-bbb';
const DOC_ID = 'doc-ccc';
const FILE_KEY = 'tenants/tenant-aaa/projects/proj-bbb/documents/doc-ccc/plano.pdf';
const SIGNED_URL = 'https://storage.example.com/signed?token=abc';

const actor: AuthenticatedUser = {
  id: 'user-111',
  email: 'user@test.com',
  role: 'admin' as any,
  tenantId: TENANT_ID,
};

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'plano.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('PDF content'),
    size: 11,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: DOC_ID,
    name: 'plano.pdf',
    originalName: 'plano.pdf',
    fileKey: FILE_KEY,
    mimeType: 'application/pdf',
    fileSizeBytes: 11,
    status: DocumentStatus.UPLOADED,
    documentType: DocumentType.ARCHITECTURAL,
    projectId: PROJECT_ID,
    uploadedById: actor.id,
    tenantId: TENANT_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: null as any,
    uploadedBy: null as any,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('DocumentsService', () => {
  let service: DocumentsService;

  let documentRepo: jest.Mocked<Record<string, jest.Mock>>;
  let fileStorage: jest.Mocked<Record<string, jest.Mock>>;
  let projectsService: jest.Mocked<Record<string, jest.Mock>>;

  beforeEach(async () => {
    documentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    fileStorage = {
      buildKey: jest.fn().mockReturnValue(FILE_KEY),
      upload: jest.fn().mockResolvedValue(FILE_KEY),
      download: jest.fn(),
      getUrl: jest.fn(),
      getSignedUrl: jest.fn().mockResolvedValue(SIGNED_URL),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    projectsService = {
      findById: jest.fn().mockResolvedValue({ id: PROJECT_ID, name: 'Project', tenantId: TENANT_ID }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(Document), useValue: documentRepo },
        { provide: FILE_STORAGE_SERVICE, useValue: fileStorage },
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();

    service = module.get(DocumentsService);
  });

  // -------------------------------------------------------------------------
  // upload
  // -------------------------------------------------------------------------

  describe('upload', () => {
    it('creates a PENDING record, uploads the file, and returns UPLOADED document with signed URL', async () => {
      const pendingDoc = makeDocument({ id: DOC_ID, status: DocumentStatus.PENDING_UPLOAD, fileKey: 'pending' });
      const uploadedDoc = makeDocument({ fileKey: FILE_KEY, fileSizeBytes: 11 });

      documentRepo.create.mockReturnValue(pendingDoc);
      documentRepo.save
        .mockResolvedValueOnce({ id: DOC_ID }) // reserveDocumentRecord
        .mockResolvedValueOnce(uploadedDoc);   // final save after upload
      documentRepo.findOneOrFail.mockResolvedValue(pendingDoc);

      const result = await service.upload(PROJECT_ID, makeFile(), {}, actor);

      expect(projectsService.findById).toHaveBeenCalledWith(PROJECT_ID, TENANT_ID);
      expect(fileStorage.buildKey).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        documentId: DOC_ID,
        fileName: 'plano.pdf',
      });
      expect(fileStorage.upload).toHaveBeenCalledWith(
        expect.any(Buffer),
        FILE_KEY,
        expect.objectContaining({ contentType: 'application/pdf' }),
      );
      expect(result.document).toEqual(uploadedDoc);
      expect(result.url).toBe(SIGNED_URL);
    });

    it('deletes the pending record and throws InternalServerErrorException when storage times out', async () => {
      documentRepo.create.mockReturnValue(makeDocument({ status: DocumentStatus.PENDING_UPLOAD }));
      documentRepo.save.mockResolvedValueOnce({ id: DOC_ID });
      documentRepo.delete.mockResolvedValue(undefined);
      fileStorage.upload.mockRejectedValue(new StorageTimeoutError('upload', 'some-key'));

      await expect(service.upload(PROJECT_ID, makeFile(), {}, actor)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(documentRepo.delete).toHaveBeenCalledWith(DOC_ID);
    });

    it('deletes the pending record and throws InternalServerErrorException when credentials are invalid', async () => {
      documentRepo.create.mockReturnValue(makeDocument({ status: DocumentStatus.PENDING_UPLOAD }));
      documentRepo.save.mockResolvedValueOnce({ id: DOC_ID });
      documentRepo.delete.mockResolvedValue(undefined);
      fileStorage.upload.mockRejectedValue(new StorageInvalidCredentialsError('invalid'));

      await expect(service.upload(PROJECT_ID, makeFile(), {}, actor)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(documentRepo.delete).toHaveBeenCalledWith(DOC_ID);
    });

    it('deletes the pending record and throws InternalServerErrorException for generic StorageError', async () => {
      documentRepo.create.mockReturnValue(makeDocument({ status: DocumentStatus.PENDING_UPLOAD }));
      documentRepo.save.mockResolvedValueOnce({ id: DOC_ID });
      documentRepo.delete.mockResolvedValue(undefined);
      fileStorage.upload.mockRejectedValue(new StorageError('storage failure'));

      await expect(service.upload(PROJECT_ID, makeFile(), {}, actor)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(documentRepo.delete).toHaveBeenCalledWith(DOC_ID);
    });

    it('propagates error when projectsService.findById throws', async () => {
      projectsService.findById.mockRejectedValue(new ResourceNotFoundException('Project', PROJECT_ID));

      await expect(service.upload(PROJECT_ID, makeFile(), {}, actor)).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(fileStorage.upload).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe('findById', () => {
    it('returns the document when found', async () => {
      const doc = makeDocument();
      documentRepo.findOne.mockResolvedValue(doc);

      const result = await service.findById(DOC_ID, PROJECT_ID, TENANT_ID);

      expect(documentRepo.findOne).toHaveBeenCalledWith({
        where: { id: DOC_ID, projectId: PROJECT_ID, tenantId: TENANT_ID },
      });
      expect(result).toEqual(doc);
    });

    it('throws ResourceNotFoundException when not found', async () => {
      documentRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(DOC_ID, PROJECT_ID, TENANT_ID)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // getSignedDownloadUrl
  // -------------------------------------------------------------------------

  describe('getSignedDownloadUrl', () => {
    it('returns signed URL for an existing document', async () => {
      documentRepo.findOne.mockResolvedValue(makeDocument());

      const url = await service.getSignedDownloadUrl(DOC_ID, PROJECT_ID, TENANT_ID);

      expect(fileStorage.getSignedUrl).toHaveBeenCalledWith(FILE_KEY, { expiresInSeconds: 900 });
      expect(url).toBe(SIGNED_URL);
    });

    it('throws ResourceNotFoundException when document file not found in storage', async () => {
      documentRepo.findOne.mockResolvedValue(makeDocument());
      fileStorage.getSignedUrl.mockRejectedValue(new StorageFileNotFoundError('not found'));

      await expect(
        service.getSignedDownloadUrl(DOC_ID, PROJECT_ID, TENANT_ID),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('throws InternalServerErrorException when storage returns generic error', async () => {
      documentRepo.findOne.mockResolvedValue(makeDocument());
      fileStorage.getSignedUrl.mockRejectedValue(new StorageError('error'));

      await expect(
        service.getSignedDownloadUrl(DOC_ID, PROJECT_ID, TENANT_ID),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    it('deletes the file from storage and removes the DB record', async () => {
      const doc = makeDocument();
      documentRepo.findOne.mockResolvedValue(doc);
      documentRepo.remove.mockResolvedValue(doc);

      await service.remove(DOC_ID, PROJECT_ID, actor);

      expect(fileStorage.delete).toHaveBeenCalledWith(FILE_KEY);
      expect(documentRepo.remove).toHaveBeenCalledWith(doc);
    });

    it('still removes the DB record when storage delete fails (non-fatal)', async () => {
      const doc = makeDocument();
      documentRepo.findOne.mockResolvedValue(doc);
      documentRepo.remove.mockResolvedValue(doc);
      fileStorage.delete.mockRejectedValue(new StorageError('cannot delete'));

      await service.remove(DOC_ID, PROJECT_ID, actor);

      expect(documentRepo.remove).toHaveBeenCalledWith(doc);
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    it('returns paginated documents for the project', async () => {
      const docs = [makeDocument()];
      documentRepo.findAndCount.mockResolvedValue([docs, 1]);

      const pagination = new PaginationDto();
      const result = await service.findAll(PROJECT_ID, TENANT_ID, pagination);

      expect(documentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId: PROJECT_ID, tenantId: TENANT_ID } }),
      );
      expect(result.data).toEqual(docs);
      expect(result.meta.total).toBe(1);
    });
  });
});
