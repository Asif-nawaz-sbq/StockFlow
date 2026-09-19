import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { Repository } from 'typeorm';
import { AUDIT_ACTION_KEY, AuthenticatedUser } from 'src/common/decorators';
import { AuditLog } from 'src/modules/audit/entities/audit-log.entity';

/** Never write these into the audit trail, whatever the handler received. */
const REDACTED_FIELDS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'passwordHash',
  'token',
  'refreshToken',
  'accessToken',
]);

function redact(input: unknown): Record<string, unknown> | null {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    out[key] = REDACTED_FIELDS.has(key) ? '[redacted]' : value;
  }
  return out;
}

/**
 * Writes an audit row after a handler tagged with @Audited succeeds. The insert
 * is deliberately outside the handler's transaction: an audit failure should
 * never roll back a business write that already committed.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    return next.handle().pipe(
      tap((result) => {
        if (!user?.tenantId) return;

        const entityId =
          (result as { id?: string })?.id ?? (request.params?.id as string | undefined) ?? null;

        void this.auditRepo
          .save(
            this.auditRepo.create({
              tenantId: user.tenantId,
              actorUserId: user.userId,
              actorEmail: user.email,
              action,
              entityType: action.split('.')[0] ?? null,
              entityId,
              changes: redact(request.body),
              requestId: (request.headers['x-request-id'] as string) ?? null,
              ipAddress: request.ip ?? null,
            }),
          )
          .catch(() => undefined);
      }),
    );
  }
}
