import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { RedisService } from 'src/redis/redis.service';
import { cacheKeys } from 'src/redis/cache-keys';

export interface AccessTokenPayload {
  sub: string;
  tid: string;
  email: string;
  roles: string[];
  perms: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  tid: string;
  jti: string;
  ver: number;
}

interface StoredRefresh {
  userId: string;
  tenantId: string;
  tokenVersion: number;
}

/**
 * Access tokens are short-lived and stateless. Refresh tokens are stateless
 * JWTs too, but their jti is tracked in Redis so a logout actually revokes
 * them - without that, "log out" would just be deleting a cookie the attacker
 * already copied.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  async issueAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: this.accessTtlSeconds(),
    });
  }

  async issueRefreshToken(userId: string, tenantId: string, tokenVersion: number): Promise<string> {
    const jti = randomUUID();
    const token = await this.jwt.signAsync(
      {
        sub: userId,
        tid: tenantId,
        jti,
        ver: tokenVersion,
      } satisfies RefreshTokenPayload,
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: this.refreshTtlSeconds(),
      },
    );

    await this.redis.setJson(
      cacheKeys.refreshToken(jti),
      { userId, tenantId, tokenVersion } satisfies StoredRefresh,
      this.refreshTtlSeconds(),
    );

    return token;
  }

  /**
   * Verifies, then immediately burns the jti. A refresh token is single-use:
   * if the same one arrives twice, the second attempt has no Redis entry and
   * is rejected.
   */
  async consumeRefreshToken(token: string): Promise<StoredRefresh> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Session expired, sign in again',
      });
    }

    const stored = await this.redis.getJson<StoredRefresh>(cacheKeys.refreshToken(payload.jti));
    if (!stored) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REVOKED',
        message: 'Session expired, sign in again',
      });
    }

    await this.redis.forget(cacheKeys.refreshToken(payload.jti));
    return stored;
  }

  async revokeRefreshToken(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = this.jwt.decode<RefreshTokenPayload | null>(token);
      if (payload?.jti) await this.redis.forget(cacheKeys.refreshToken(payload.jti));
    } catch {
      // A malformed cookie on logout is not worth an error response.
    }
  }

  accessTtlSeconds(): number {
    return parseDuration(process.env.JWT_ACCESS_TTL ?? '15m');
  }

  refreshTtlSeconds(): number {
    return parseDuration(process.env.JWT_REFRESH_TTL ?? '7d');
  }
}

const UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

export function parseDuration(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) throw new Error(`Unsupported duration format: ${input}`);
  return Number(match[1]) * UNITS[match[2]];
}
