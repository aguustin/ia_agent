export declare class PreValidationError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export declare class PreValidationFileError extends PreValidationError {
    constructor(documentId: string, cause?: unknown);
}
export declare class PreValidationTextExtractionError extends PreValidationError {
    constructor(documentId: string, cause?: unknown);
}
export declare class PreValidationAIError extends PreValidationError {
    constructor(cause?: unknown);
}
export declare class PreValidationInvalidResponseError extends PreValidationError {
    constructor(detail: string);
}
