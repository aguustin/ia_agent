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
var R2StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.R2StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const storage_utils_1 = require("./storage.utils");
const storage_errors_1 = require("./storage.errors");
let R2StorageService = R2StorageService_1 = class R2StorageService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(R2StorageService_1.name);
    }
    onModuleInit() {
        const provider = this.config.get('STORAGE_PROVIDER', 'local');
        if (provider !== 'r2') {
            this.logger.log('R2StorageService is instantiated but not active (STORAGE_PROVIDER ≠ r2) — skipping initialization');
            return;
        }
        const accountId = this.config.get('r2.accountId', '');
        const accessKeyId = this.config.get('r2.accessKeyId', '');
        const secretAccessKey = this.config.get('r2.secretAccessKey', '');
        const bucketName = this.config.get('r2.bucketName', '');
        const missing = [
            ['R2_ACCOUNT_ID', accountId],
            ['R2_ACCESS_KEY_ID', accessKeyId],
            ['R2_SECRET_ACCESS_KEY', secretAccessKey],
            ['R2_BUCKET_NAME', bucketName],
        ]
            .filter(([, v]) => !v)
            .map(([k]) => k);
        if (missing.length > 0) {
            throw new storage_errors_1.StorageConfigurationError(`Missing required environment variables: ${missing.join(', ')}`);
        }
        this.bucket = bucketName;
        this.publicUrl = this.config.get('r2.publicUrl', '').replace(/\/$/, '');
        this.signedUrlExpiresIn = this.config.get('r2.signedUrlExpiresIn', 3_600);
        this.uploadTimeoutMs = this.config.get('r2.uploadTimeoutMs', 120_000);
        this.downloadTimeoutMs = this.config.get('r2.downloadTimeoutMs', 60_000);
        this.apiTimeoutMs = this.config.get('r2.apiTimeoutMs', 10_000);
        this.retryAttempts = this.config.get('r2.retryAttempts', 3);
        this.client = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
        });
        this.logger.log(`R2 storage initialized — bucket: ${this.bucket}`);
    }
    async upload(file, filename, options) {
        return this.withRetry('upload', () => this.withAbortTimeout((signal) => this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: filename,
            Body: file,
            ContentType: options?.contentType ?? 'application/octet-stream',
            ContentLength: file.length,
            ...(options?.metadata && { Metadata: options.metadata }),
        }), { abortSignal: signal }), this.uploadTimeoutMs, 'upload', filename).then(() => {
            this.logger.debug(`Uploaded ${file.length}B → ${filename}`);
            return filename;
        }));
    }
    async download(key) {
        return this.withRetry('download', async () => {
            const response = await this.withAbortTimeout((signal) => this.client.send(new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key }), {
                abortSignal: signal,
            }), this.downloadTimeoutMs, 'download', key);
            if (!response.Body) {
                throw new storage_errors_1.StorageDownloadError(key, new Error('Response body is empty'));
            }
            const totalBytes = response.ContentLength ?? 0;
            if (totalBytes > 0) {
                const buffer = Buffer.allocUnsafe(totalBytes);
                let offset = 0;
                for await (const chunk of response.Body) {
                    buffer.set(chunk, offset);
                    offset += chunk.length;
                }
                return buffer;
            }
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        });
    }
    async delete(key) {
        return this.withRetry('delete', () => this.withAbortTimeout((signal) => this.client.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }), {
            abortSignal: signal,
        }), this.apiTimeoutMs, 'delete', key).then(() => {
            this.logger.debug(`Deleted object: ${key}`);
        }));
    }
    getUrl(key) {
        if (!this.publicUrl) {
            throw new storage_errors_1.StorageConfigurationError('R2_PUBLIC_URL is not set. Configure a custom domain on your R2 bucket, ' +
                'or use getSignedUrl() for private bucket access.');
        }
        return `${this.publicUrl}/${key}`;
    }
    async getSignedUrl(key, options) {
        const expiresIn = options?.expiresInSeconds ?? this.signedUrlExpiresIn;
        const filename = key.split('/').pop() ?? 'document';
        return this.withAbortTimeout(() => (0, s3_request_presigner_1.getSignedUrl)(this.client, new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        }), { expiresIn }), this.apiTimeoutMs, 'getSignedUrl', key);
    }
    buildKey(params) {
        return (0, storage_utils_1.buildStorageKey)(params);
    }
    async withAbortTimeout(operation, timeoutMs, opName, key) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await operation(controller.signal);
        }
        catch (error) {
            if (controller.signal.aborted) {
                throw new storage_errors_1.StorageTimeoutError(opName, key);
            }
            if (error instanceof storage_errors_1.StorageError)
                throw error;
            throw this.mapError(opName, key, error);
        }
        finally {
            clearTimeout(timer);
        }
    }
    async withRetry(opName, operation) {
        let lastError;
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (!this.isRetryable(error))
                    throw error;
                if (attempt === this.retryAttempts)
                    break;
                const baseDelay = 250 * 2 ** (attempt - 1);
                const jitter = Math.random() * 100;
                const delayMs = Math.min(baseDelay + jitter, 4_000);
                this.logger.warn(`R2 '${opName}' attempt ${attempt}/${this.retryAttempts} failed — ` +
                    `retrying in ${Math.round(delayMs)}ms (${lastError.message})`);
                await this.delay(delayMs);
            }
        }
        throw lastError;
    }
    isRetryable(error) {
        if (error instanceof storage_errors_1.StorageInvalidCredentialsError ||
            error instanceof storage_errors_1.StorageConfigurationError ||
            error instanceof storage_errors_1.StorageFileNotFoundError) {
            return false;
        }
        if (error instanceof client_s3_1.S3ServiceException) {
            const status = error.$metadata.httpStatusCode ?? 0;
            return status === 429 || status >= 500;
        }
        if (error instanceof Error) {
            return (error.message.includes('ECONNRESET') ||
                error.message.includes('ECONNREFUSED') ||
                error.message.includes('socket hang up') ||
                error.message.includes('ETIMEDOUT'));
        }
        return false;
    }
    mapError(operation, key, error) {
        if (error instanceof client_s3_1.S3ServiceException) {
            const status = error.$metadata.httpStatusCode;
            if (status === 401 || status === 403) {
                return new storage_errors_1.StorageInvalidCredentialsError('R2');
            }
            if (status === 404 || error.name === 'NoSuchKey' || error.name === 'NotFound') {
                return new storage_errors_1.StorageFileNotFoundError(key);
            }
        }
        switch (operation) {
            case 'upload':
                return new storage_errors_1.StorageUploadError(key, error);
            case 'download':
                return new storage_errors_1.StorageDownloadError(key, error);
            case 'delete':
                return new storage_errors_1.StorageDeleteError(key, error);
            default:
                return new storage_errors_1.StorageError(`Storage operation '${operation}' failed for key '${key}'`, error);
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.R2StorageService = R2StorageService;
exports.R2StorageService = R2StorageService = R2StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], R2StorageService);
//# sourceMappingURL=r2.provider.js.map