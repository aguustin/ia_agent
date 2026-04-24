"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnprocessableEntityException = exports.ForbiddenDomainException = exports.ConflictException = exports.ResourceNotFoundException = exports.DomainException = void 0;
const common_1 = require("@nestjs/common");
class DomainException extends common_1.HttpException {
    constructor(message, status = common_1.HttpStatus.BAD_REQUEST, code) {
        super({ message, code }, status);
        this.code = code;
    }
}
exports.DomainException = DomainException;
class ResourceNotFoundException extends DomainException {
    constructor(resource, id) {
        super(id ? `${resource} with id '${id}' not found` : `${resource} not found`, common_1.HttpStatus.NOT_FOUND, 'RESOURCE_NOT_FOUND');
    }
}
exports.ResourceNotFoundException = ResourceNotFoundException;
class ConflictException extends DomainException {
    constructor(message) {
        super(message, common_1.HttpStatus.CONFLICT, 'CONFLICT');
    }
}
exports.ConflictException = ConflictException;
class ForbiddenDomainException extends DomainException {
    constructor(message = 'Access denied') {
        super(message, common_1.HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }
}
exports.ForbiddenDomainException = ForbiddenDomainException;
class UnprocessableEntityException extends DomainException {
    constructor(message) {
        super(message, common_1.HttpStatus.UNPROCESSABLE_ENTITY, 'UNPROCESSABLE_ENTITY');
    }
}
exports.UnprocessableEntityException = UnprocessableEntityException;
//# sourceMappingURL=domain.exception.js.map