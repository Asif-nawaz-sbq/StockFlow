import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Domain failures carry a stable machine-readable code so the frontend can
 * branch on it. HTTP status alone isn't enough - "insufficient stock" and
 * "credit limit exceeded" are both 409 but need different UI.
 */
export abstract class DomainException extends HttpException {
  protected constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}

export class ResourceNotFoundError extends DomainException {
  constructor(resource: string, id: string) {
    super('RESOURCE_NOT_FOUND', `${resource} ${id} was not found`, HttpStatus.NOT_FOUND, {
      resource,
      id,
    });
  }
}

export class InsufficientStockError extends DomainException {
  constructor(
    shortfalls: Array<{
      productId: string;
      sku: string;
      requested: number;
      available: number;
    }>,
  ) {
    super(
      'INSUFFICIENT_STOCK',
      'One or more lines cannot be allocated from the selected warehouse',
      HttpStatus.CONFLICT,
      { shortfalls },
    );
  }
}

export class InvalidStateTransitionError extends DomainException {
  constructor(entity: string, from: string, to: string) {
    super(
      'INVALID_STATE_TRANSITION',
      `${entity} cannot move from ${from} to ${to}`,
      HttpStatus.CONFLICT,
      { entity, from, to },
    );
  }
}

export class CreditLimitExceededError extends DomainException {
  constructor(customerId: string, limitCents: number, exposureCents: number) {
    super(
      'CREDIT_LIMIT_EXCEEDED',
      'Order would put the customer over their credit limit',
      HttpStatus.CONFLICT,
      { customerId, limitCents, exposureCents },
    );
  }
}

/** "a" or "an" - this string is shown to users verbatim. */
function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'An' : 'A';
}

export class DuplicateResourceError extends DomainException {
  constructor(resource: string, field: string, value: string) {
    super(
      'DUPLICATE_RESOURCE',
      `${article(resource)} ${resource} with this ${field} already exists`,
      HttpStatus.CONFLICT,
      { resource, field, value },
    );
  }
}

export class IdempotencyConflictError extends DomainException {
  constructor(key: string) {
    super(
      'IDEMPOTENCY_KEY_REUSED',
      'This Idempotency-Key was already used with a different request body',
      HttpStatus.UNPROCESSABLE_ENTITY,
      { key },
    );
  }
}
