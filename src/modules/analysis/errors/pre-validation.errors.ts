/** Base for all pre-validation pipeline errors. Catch this to handle any phase. */
export class PreValidationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }
}

/** Storage retrieval failed or the file was not found in the backend. */
export class PreValidationFileError extends PreValidationError {
  constructor(documentId: string, cause?: unknown) {
    super(`Cannot retrieve file for document '${documentId}'`, cause);
  }
}

/** The file was found but text could not be extracted from it. */
export class PreValidationTextExtractionError extends PreValidationError {
  constructor(documentId: string, cause?: unknown) {
    super(`Text extraction failed for document '${documentId}'`, cause);
  }
}

/** The AI provider threw or returned an unusable response. */
export class PreValidationAIError extends PreValidationError {
  constructor(cause?: unknown) {
    super('AI provider failed to complete pre-validation', cause);
  }
}

/** The AI responded but the payload does not match the expected schema. */
export class PreValidationInvalidResponseError extends PreValidationError {
  constructor(detail: string) {
    super(`AI returned an invalid pre-validation response: ${detail}`);
  }
}
