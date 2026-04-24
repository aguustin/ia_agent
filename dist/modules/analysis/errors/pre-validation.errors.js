"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreValidationInvalidResponseError = exports.PreValidationAIError = exports.PreValidationTextExtractionError = exports.PreValidationFileError = exports.PreValidationError = void 0;
class PreValidationError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = this.constructor.name;
        if (Error.captureStackTrace)
            Error.captureStackTrace(this, this.constructor);
    }
}
exports.PreValidationError = PreValidationError;
class PreValidationFileError extends PreValidationError {
    constructor(documentId, cause) {
        super(`Cannot retrieve file for document '${documentId}'`, cause);
    }
}
exports.PreValidationFileError = PreValidationFileError;
class PreValidationTextExtractionError extends PreValidationError {
    constructor(documentId, cause) {
        super(`Text extraction failed for document '${documentId}'`, cause);
    }
}
exports.PreValidationTextExtractionError = PreValidationTextExtractionError;
class PreValidationAIError extends PreValidationError {
    constructor(cause) {
        super('AI provider failed to complete pre-validation', cause);
    }
}
exports.PreValidationAIError = PreValidationAIError;
class PreValidationInvalidResponseError extends PreValidationError {
    constructor(detail) {
        super(`AI returned an invalid pre-validation response: ${detail}`);
    }
}
exports.PreValidationInvalidResponseError = PreValidationInvalidResponseError;
//# sourceMappingURL=pre-validation.errors.js.map