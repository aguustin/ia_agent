import { HttpException, HttpStatus } from '@nestjs/common';
export declare class DomainException extends HttpException {
    readonly code?: string | undefined;
    constructor(message: string, status?: HttpStatus, code?: string | undefined);
}
export declare class ResourceNotFoundException extends DomainException {
    constructor(resource: string, id?: string);
}
export declare class ConflictException extends DomainException {
    constructor(message: string);
}
export declare class ForbiddenDomainException extends DomainException {
    constructor(message?: string);
}
export declare class UnprocessableEntityException extends DomainException {
    constructor(message: string);
}
