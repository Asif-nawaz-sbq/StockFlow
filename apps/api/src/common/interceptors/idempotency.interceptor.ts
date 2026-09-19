import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { createHash } from 'node:crypto';
import { Observable, from, of, switchMap, tap } from 'rxjs';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from 'src/common/decorators';
import { IdempotencyKey } from 'src/common/entities/idempotency-key.entity';
import { IdempotencyConflictError } from 'src/common/errors/domain.errors';

const HEADER = 'idempotency-key';

/**
 * Replay protection for state-changing order endpoints.
 *
 * Same key + same body   -> the stored response is replayed, handler is skipped.
 * Same key + different body -> 422, because the client is reusing a key by mistake.
 * No key                 -> passes straight through; the header is opt-in.
 *
 * Backed by Postgres rather than Redis on purpose - see IdempotencyKey.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly repo: Repository<IdempotencyKey>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const key = request.headers[HEADER] as string | undefined;

    if (!key || !request.user?.tenantId) return next.handle();

    const tenantId = request.user.tenantId;
    const endpoint = `${request.method} ${request.route?.path ?? request.originalUrl}`;
    const requestHash = createHash('sha256')
      .update(JSON.stringify(request.body ?? {}))
      .digest('hex');

    return from(this.repo.findOne({ where: { tenantId, key } })).pipe(
      switchMap((existing) => {
        if (existing) {
          if (existing.requestHash !== requestHash) {
            throw new IdempotencyConflictError(key);
          }
          // Still in flight: treat as a replay rather than running the handler twice.
          return of(existing.responseBody ?? { status: 'in_progress' });
        }

        // Reserving the key before the handler runs is what makes a concurrent
        // duplicate hit the unique index instead of executing twice.
        const reserved = this.repo.save(this.repo.create({ tenantId, key, endpoint, requestHash }));

        return from(reserved).pipe(
          switchMap((row) =>
            next.handle().pipe(
              tap((result) => {
                void this.repo
                  .save({
                    id: row.id,
                    responseStatus: 200,
                    responseBody: result as Record<string, unknown>,
                    completedAt: new Date(),
                  })
                  .catch(() => undefined);
              }),
            ),
          ),
        );
      }),
    );
  }
}
