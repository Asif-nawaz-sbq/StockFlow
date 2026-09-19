import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from 'src/common/decorators';
import { ACCESS_COOKIE } from './auth.cookies';
import { AccessTokenPayload } from './token.service';

/**
 * Reads the access token from an httpOnly cookie first and falls back to the
 * Authorization header. The cookie is what the browser uses; the header exists
 * so the API is usable from curl and the Swagger page without a login round trip.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req.cookies?.[ACCESS_COOKIE] as string) ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET as string,
    });
  }

  /**
   * Claims are trusted as-is rather than reloaded from Postgres on every
   * request. That keeps the hot path free of a DB round trip; the cost is that
   * a permission change takes up to one access-token lifetime (15 min) to bite.
   * Anything that must revoke immediately bumps users.token_version instead.
   */
  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      tenantId: payload.tid,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.perms ?? [],
    };
  }
}
