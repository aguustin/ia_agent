import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStorageService, UploadOptions, SignedUrlOptions } from './file-storage.interface';
export declare class R2StorageService implements FileStorageService, OnModuleInit {
    private readonly config;
    private readonly logger;
    private client;
    private bucket;
    private publicUrl;
    private signedUrlExpiresIn;
    private uploadTimeoutMs;
    private downloadTimeoutMs;
    private apiTimeoutMs;
    private retryAttempts;
    constructor(config: ConfigService);
    onModuleInit(): void;
    upload(file: Buffer, filename: string, options?: UploadOptions): Promise<string>;
    download(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
    getUrl(key: string): string;
    getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
    buildKey(params: {
        tenantId: string;
        projectId: string;
        documentId: string;
        fileName: string;
    }): string;
    private withAbortTimeout;
    private withRetry;
    private isRetryable;
    private mapError;
    private delay;
}
