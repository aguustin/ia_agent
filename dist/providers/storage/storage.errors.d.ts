export declare class StorageError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export declare class StorageUploadError extends StorageError {
    constructor(key: string, cause?: unknown);
}
export declare class StorageDownloadError extends StorageError {
    constructor(key: string, cause?: unknown);
}
export declare class StorageDeleteError extends StorageError {
    constructor(key: string, cause?: unknown);
}
export declare class StorageFileNotFoundError extends StorageError {
    constructor(key: string);
}
export declare class StorageInvalidCredentialsError extends StorageError {
    constructor(provider: string);
}
export declare class StorageTimeoutError extends StorageError {
    constructor(operation: string, key: string);
}
export declare class StorageConfigurationError extends StorageError {
    constructor(detail: string);
}
