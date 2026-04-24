export declare const FILE_STORAGE_SERVICE = "FILE_STORAGE_SERVICE";
export interface UploadOptions {
    contentType?: string;
    metadata?: Record<string, string>;
}
export interface UploadResult {
    key: string;
    url: string;
    size: number;
}
export interface SignedUrlOptions {
    expiresInSeconds?: number;
}
export interface FileStorageService {
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
}
