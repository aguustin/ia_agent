export const FILE_STORAGE_SERVICE = 'FILE_STORAGE_SERVICE';

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

/**
 * Abstraction over any file storage backend.
 *
 * - `upload`: stores bytes at the given key; returns the canonical key.
 * - `download`: retrieves bytes by key; used internally (e.g. analysis processor).
 * - `delete`: removes the object; callers are responsible for handling soft failures.
 * - `getUrl`: synchronous public URL — only valid when the bucket has public access
 *   configured (e.g. R2 custom domain). For private buckets use `getSignedUrl`.
 * - `getSignedUrl`: time-limited presigned URL for private bucket access.
 * - `buildKey`: canonical key builder; keeps path logic out of callers.
 */
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
