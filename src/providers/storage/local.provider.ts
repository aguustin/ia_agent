import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileStorageService, UploadOptions, SignedUrlOptions } from './file-storage.interface';
import {
  StorageDeleteError,
  StorageDownloadError,
  StorageFileNotFoundError,
  StorageUploadError,
} from './storage.errors';
import { buildStorageKey } from './storage.utils';

@Injectable()
export class LocalStorageService implements FileStorageService {
  private readonly logger = new Logger(LocalStorageService.name);

  private readonly storagePath: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.storagePath = path.resolve(
      this.config.get<string>('localStorage.path', './uploads'),
    );
    this.baseUrl = this.config
      .get<string>('localStorage.baseUrl', 'http://localhost:3000')
      .replace(/\/$/, '');

    this.logger.log(`Local storage initialized — path: ${this.storagePath}`);
  }

  async upload(file: Buffer, key: string, _options?: UploadOptions): Promise<string> {
    const filePath = this.resolveKey(key);
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file);
      this.logger.debug(`Stored ${file.length}B → ${filePath}`);
      return key;
    } catch (error) {
      throw new StorageUploadError(key, error);
    }
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolveKey(key);
    try {
      return await fs.readFile(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') throw new StorageFileNotFoundError(key);
      throw new StorageDownloadError(key, error);
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKey(key);
    try {
      await fs.unlink(filePath);
      this.logger.debug(`Deleted local file: ${filePath}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') return; // Already gone — treat as success
      throw new StorageDeleteError(key, error);
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/storage/files/${key}`;
  }

  async getSignedUrl(key: string, _options?: SignedUrlOptions): Promise<string> {
    // Local storage doesn't require signed URLs — direct URL is sufficient for MVP
    return this.getUrl(key);
  }

  buildKey(params: {
    tenantId: string;
    projectId: string;
    documentId: string;
    fileName: string;
  }): string {
    return buildStorageKey(params);
  }

  /** Resolves a storage key to an absolute filesystem path. */
  resolveKey(key: string): string {
    const normalized = path.normalize(key.split('/').join(path.sep));
    return path.join(this.storagePath, normalized);
  }
}
