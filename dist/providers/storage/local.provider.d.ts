import { ConfigService } from '@nestjs/config';
import { FileStorageService, UploadOptions, SignedUrlOptions } from './file-storage.interface';
export declare class LocalStorageService implements FileStorageService {
    private readonly config;
    private readonly logger;
    private readonly storagePath;
    private readonly baseUrl;
    constructor(config: ConfigService);
    upload(file: Buffer, key: string, _options?: UploadOptions): Promise<string>;
    download(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
    getUrl(key: string): string;
    getSignedUrl(key: string, _options?: SignedUrlOptions): Promise<string>;
    buildKey(params: {
        tenantId: string;
        projectId: string;
        documentId: string;
        fileName: string;
    }): string;
    resolveKey(key: string): string;
}
