/**
 * Base class for all storage-layer errors.
 * Extend this to catch storage failures uniformly at the service boundary.
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class StorageUploadError extends StorageError {
  constructor(key: string, cause?: unknown) {
    super(`Failed to upload object to key '${key}'`, cause);
  }
}

export class StorageDownloadError extends StorageError {
  constructor(key: string, cause?: unknown) {
    super(`Failed to download object from key '${key}'`, cause);
  }
}

export class StorageDeleteError extends StorageError {
  constructor(key: string, cause?: unknown) {
    super(`Failed to delete object at key '${key}'`, cause);
  }
}

export class StorageFileNotFoundError extends StorageError {
  constructor(key: string) {
    super(`Object not found in storage: '${key}'`);
  }
}

export class StorageInvalidCredentialsError extends StorageError {
  constructor(provider: string) {
    super(
      `Storage provider '${provider}' rejected the request due to invalid credentials. ` +
        'Check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables.',
    );
  }
}

export class StorageTimeoutError extends StorageError {
  constructor(operation: string, key: string) {
    super(`Storage operation '${operation}' timed out for key: '${key}'`);
  }
}

export class StorageConfigurationError extends StorageError {
  constructor(detail: string) {
    super(`Storage misconfiguration: ${detail}`);
  }
}
