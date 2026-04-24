"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageConfigurationError = exports.StorageTimeoutError = exports.StorageInvalidCredentialsError = exports.StorageFileNotFoundError = exports.StorageDeleteError = exports.StorageDownloadError = exports.StorageUploadError = exports.StorageError = void 0;
class StorageError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = this.constructor.name;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.StorageError = StorageError;
class StorageUploadError extends StorageError {
    constructor(key, cause) {
        super(`Failed to upload object to key '${key}'`, cause);
    }
}
exports.StorageUploadError = StorageUploadError;
class StorageDownloadError extends StorageError {
    constructor(key, cause) {
        super(`Failed to download object from key '${key}'`, cause);
    }
}
exports.StorageDownloadError = StorageDownloadError;
class StorageDeleteError extends StorageError {
    constructor(key, cause) {
        super(`Failed to delete object at key '${key}'`, cause);
    }
}
exports.StorageDeleteError = StorageDeleteError;
class StorageFileNotFoundError extends StorageError {
    constructor(key) {
        super(`Object not found in storage: '${key}'`);
    }
}
exports.StorageFileNotFoundError = StorageFileNotFoundError;
class StorageInvalidCredentialsError extends StorageError {
    constructor(provider) {
        super(`Storage provider '${provider}' rejected the request due to invalid credentials. ` +
            'Check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables.');
    }
}
exports.StorageInvalidCredentialsError = StorageInvalidCredentialsError;
class StorageTimeoutError extends StorageError {
    constructor(operation, key) {
        super(`Storage operation '${operation}' timed out for key: '${key}'`);
    }
}
exports.StorageTimeoutError = StorageTimeoutError;
class StorageConfigurationError extends StorageError {
    constructor(detail) {
        super(`Storage misconfiguration: ${detail}`);
    }
}
exports.StorageConfigurationError = StorageConfigurationError;
//# sourceMappingURL=storage.errors.js.map