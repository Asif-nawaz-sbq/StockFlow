import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  permissions: string[];
  roles: string[];
}

export const IS_PUBLIC_KEY = 'auth:public';
export const PERMISSIONS_KEY = 'auth:permissions';
export const AUDIT_ACTION_KEY = 'audit:action';

/** Skips JwtAuthGuard. Only login, refresh and the health endpoints use it. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** All listed permissions must be held; there is no "any of" variant on purpose. */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Tags a handler for AuditInterceptor, e.g. @Audited('sales_order.confirm'). */
export const Audited = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);

export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);

/**
 * Tenant id always comes from the validated JWT, never from a header or body
 * parameter - otherwise any authenticated user could read another workspace.
 */
export const TenantId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
  if (!request.user?.tenantId) {
    throw new Error('TenantId decorator used on a route without JwtAuthGuard');
  }
  return request.user.tenantId;
});
