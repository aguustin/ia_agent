import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly code?: string,
  ) {
    super({ message, code }, status);
  }
}

export class ResourceNotFoundException extends DomainException {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      HttpStatus.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
    );
  }
}

export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
  }
}

export class ForbiddenDomainException extends DomainException {
  constructor(message = 'Access denied') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

export class UnprocessableEntityException extends DomainException {
  constructor(message: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, 'UNPROCESSABLE_ENTITY');
  }
}
