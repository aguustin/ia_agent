import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  FileStorageService,
  UploadOptions,
  SignedUrlOptions,
} from './file-storage.interface';
import { buildStorageKey } from './storage.utils';
import {
  StorageConfigurationError,
  StorageDeleteError,
  StorageDownloadError,
  StorageError,
  StorageFileNotFoundError,
  StorageInvalidCredentialsError,
  StorageTimeoutError,
  StorageUploadError,
} from './storage.errors';

@Injectable()
export class R2StorageService implements FileStorageService, OnModuleInit {
  private readonly logger = new Logger(R2StorageService.name);

  private client: S3Client;
  private bucket: string;
  private publicUrl: string;
  private signedUrlExpiresIn: number;
  private uploadTimeoutMs: number;
  private downloadTimeoutMs: number;
  private apiTimeoutMs: number;
  private retryAttempts: number;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const provider = this.config.get<string>('STORAGE_PROVIDER', 'local');
    if (provider !== 'r2') {
      this.logger.log('R2StorageService is instantiated but not active (STORAGE_PROVIDER ≠ r2) — skipping initialization');
      return;
    }

    // Validate all required config eagerly — fail at startup, not on first request.
    const accountId = this.config.get<string>('r2.accountId', '');
    const accessKeyId = this.config.get<string>('r2.accessKeyId', '');
    const secretAccessKey = this.config.get<string>('r2.secretAccessKey', '');
    const bucketName = this.config.get<string>('r2.bucketName', '');

    const missing = (
      [
        ['R2_ACCOUNT_ID', accountId],
        ['R2_ACCESS_KEY_ID', accessKeyId],
        ['R2_SECRET_ACCESS_KEY', secretAccessKey],
        ['R2_BUCKET_NAME', bucketName],
      ] as const
    )
      .filter(([, v]) => !v)
      .map(([k]) => k);

    if (missing.length > 0) {
      throw new StorageConfigurationError(
        `Missing required environment variables: ${missing.join(', ')}`,
      );
    }

    this.bucket = bucketName;
    this.publicUrl = this.config.get<string>('r2.publicUrl', '').replace(/\/$/, '');
    this.signedUrlExpiresIn = this.config.get<number>('r2.signedUrlExpiresIn', 3_600);
    this.uploadTimeoutMs = this.config.get<number>('r2.uploadTimeoutMs', 120_000);
    this.downloadTimeoutMs = this.config.get<number>('r2.downloadTimeoutMs', 60_000);
    this.apiTimeoutMs = this.config.get<number>('r2.apiTimeoutMs', 10_000);
    this.retryAttempts = this.config.get<number>('r2.retryAttempts', 3);

    // No NodeHttpHandler import needed — timeouts are managed per-operation
    // with AbortController, giving finer control than a global client setting.
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    this.logger.log(`R2 storage initialized — bucket: ${this.bucket}`);
  }

  async upload(file: Buffer, filename: string, options?: UploadOptions): Promise<string> {
    return this.withRetry('upload', () =>
      this.withAbortTimeout(
        (signal) =>
          this.client.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Key: filename,
              Body: file,
              ContentType: options?.contentType ?? 'application/octet-stream',
              ContentLength: file.length,
              ...(options?.metadata && { Metadata: options.metadata }),
            }),
            { abortSignal: signal },
          ),
        this.uploadTimeoutMs,
        'upload',
        filename,
      ).then(() => {
        this.logger.debug(`Uploaded ${file.length}B → ${filename}`);
        return filename;
      }),
    );
  }

  async download(key: string): Promise<Buffer> {
    return this.withRetry('download', async () => {
      const response = await this.withAbortTimeout(
        (signal) =>
          this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
            abortSignal: signal,
          }),
        this.downloadTimeoutMs,
        'download',
        key,
      );

      if (!response.Body) {
        throw new StorageDownloadError(key, new Error('Response body is empty'));
      }

      // Pre-allocate when ContentLength is known to avoid Buffer.concat double-copy.
      const totalBytes = response.ContentLength ?? 0;

      if (totalBytes > 0) {
        const buffer = Buffer.allocUnsafe(totalBytes);
        let offset = 0;
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }
        return buffer;
      }

      // Fallback for streaming responses without Content-Length.
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    });
  }

  async delete(key: string): Promise<void> {
    return this.withRetry('delete', () =>
      this.withAbortTimeout(
        (signal) =>
          this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), {
            abortSignal: signal,
          }),
        this.apiTimeoutMs,
        'delete',
        key,
      ).then(() => {
        this.logger.debug(`Deleted object: ${key}`);
      }),
    );
  }

  getUrl(key: string): string {
    if (!this.publicUrl) {
      throw new StorageConfigurationError(
        'R2_PUBLIC_URL is not set. Configure a custom domain on your R2 bucket, ' +
          'or use getSignedUrl() for private bucket access.',
      );
    }
    return `${this.publicUrl}/${key}`;
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const expiresIn = options?.expiresInSeconds ?? this.signedUrlExpiresIn;
    const filename = key.split('/').pop() ?? 'document';

    return this.withAbortTimeout(
      () =>
        getSignedUrl(
          this.client,
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            // Ensures browsers use the original filename when downloading.
            ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          }),
          { expiresIn },
        ),
      this.apiTimeoutMs,
      'getSignedUrl',
      key,
    );
  }

  buildKey(params: {
    tenantId: string;
    projectId: string;
    documentId: string;
    fileName: string;
  }): string {
    return buildStorageKey(params);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Wraps an operation with a per-call AbortController timeout.
   * Avoids a global NodeHttpHandler timeout, giving independent control per
   * operation type (upload needs more time than a delete call).
   */
  private async withAbortTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number,
    opName: string,
    key: string,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await operation(controller.signal);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new StorageTimeoutError(opName, key);
      }
      if (error instanceof StorageError) throw error;
      throw this.mapError(opName, key, error);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Retries the operation with exponential backoff + jitter.
   * Never retries on credential errors, config errors, or 404s — only on
   * transient network/server failures where retrying is safe and sensible.
   */
  private async withRetry<T>(opName: string, operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error)) throw error;
        if (attempt === this.retryAttempts) break;

        const baseDelay = 250 * 2 ** (attempt - 1);
        const jitter = Math.random() * 100;
        const delayMs = Math.min(baseDelay + jitter, 4_000);

        this.logger.warn(
          `R2 '${opName}' attempt ${attempt}/${this.retryAttempts} failed — ` +
            `retrying in ${Math.round(delayMs)}ms (${(lastError as Error).message})`,
        );

        await this.delay(delayMs);
      }
    }

    throw lastError;
  }

  private isRetryable(error: unknown): boolean {
    if (
      error instanceof StorageInvalidCredentialsError ||
      error instanceof StorageConfigurationError ||
      error instanceof StorageFileNotFoundError
    ) {
      return false;
    }

    if (error instanceof S3ServiceException) {
      const status = error.$metadata.httpStatusCode ?? 0;
      return status === 429 || status >= 500;
    }

    if (error instanceof Error) {
      return (
        error.message.includes('ECONNRESET') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('socket hang up') ||
        error.message.includes('ETIMEDOUT')
      );
    }

    return false;
  }

  private mapError(operation: string, key: string, error: unknown): StorageError {
    if (error instanceof S3ServiceException) {
      const status = error.$metadata.httpStatusCode;

      if (status === 401 || status === 403) {
        return new StorageInvalidCredentialsError('R2');
      }
      if (status === 404 || error.name === 'NoSuchKey' || error.name === 'NotFound') {
        return new StorageFileNotFoundError(key);
      }
    }

    switch (operation) {
      case 'upload':
        return new StorageUploadError(key, error);
      case 'download':
        return new StorageDownloadError(key, error);
      case 'delete':
        return new StorageDeleteError(key, error);
      default:
        return new StorageError(
          `Storage operation '${operation}' failed for key '${key}'`,
          error,
        );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
