import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { User, UserStatus } from 'src/modules/users/entities/user.entity';
import { AuthUserDto } from './dto/auth-response.dto';
import { TokenService } from './token.service';

/**
 * OWASP-recommended argon2id parameters. 19 MiB / 2 iterations keeps a single
 * hash near 50 ms on the 0.5 vCPU Fargate task we run in production - raising
 * memory further starts to matter when several logins land at once.
 */
const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

/**
 * A real hash of a throwaway secret, computed once at startup. Unknown emails
 * are verified against this so a missing user costs the same as a wrong
 * password - otherwise response timing tells an attacker which addresses have
 * accounts. It has to be a genuine argon2 encoding: a fake string would fail
 * to parse and return in microseconds, which is the leak we are closing.
 */
const decoyHash: Promise<string> = argon2.hash(randomBytes(32).toString('hex'), ARGON_OPTIONS);

export interface AuthenticatedSession {
  user: AuthUserDto;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly tokens: TokenService,
  ) {}

  static hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON_OPTIONS);
  }

  async login(email: string, password: string): Promise<AuthenticatedSession> {
    const user = await this.users.findOne({
      where: { email: email.toLowerCase() },
      relations: { roles: { permissions: true }, tenant: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        tenantId: true,
        status: true,
        tokenVersion: true,
        passwordHash: true,
      },
    });

    const passwordMatches = await argon2
      .verify(user?.passwordHash ?? (await decoyHash), password)
      .catch(() => false);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_NOT_ACTIVE',
        message: 'This account is not active. Ask an owner to re-enable it.',
      });
    }

    if (!user.tenant?.isActive) {
      throw new UnauthorizedException({
        code: 'TENANT_SUSPENDED',
        message: 'This workspace is suspended',
      });
    }

    await this.users.update(user.id, { lastLoginAt: new Date() });

    return this.buildSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthenticatedSession> {
    const stored = await this.tokens.consumeRefreshToken(refreshToken);

    const user = await this.users.findOne({
      where: { id: stored.userId },
      relations: { roles: { permissions: true }, tenant: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_NOT_ACTIVE',
        message: 'Session is no longer valid',
      });
    }

    // Bumped by a password change or a forced logout - old refresh tokens die.
    if (user.tokenVersion !== stored.tokenVersion) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REVOKED',
        message: 'Session expired, sign in again',
      });
    }

    return this.buildSession(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    await this.tokens.revokeRefreshToken(refreshToken);
  }

  async profile(userId: string): Promise<AuthUserDto> {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: { roles: { permissions: true }, tenant: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Session not found',
      });
    }
    return AuthService.toAuthUser(user);
  }

  private async buildSession(user: User): Promise<AuthenticatedSession> {
    const dto = AuthService.toAuthUser(user);

    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.issueAccessToken({
        sub: user.id,
        tid: user.tenantId,
        email: user.email,
        roles: dto.roles,
        perms: dto.permissions,
      }),
      this.tokens.issueRefreshToken(user.id, user.tenantId, user.tokenVersion),
    ]);

    return {
      user: dto,
      accessToken,
      refreshToken,
      expiresIn: this.tokens.accessTtlSeconds(),
    };
  }

  static toAuthUser(user: User): AuthUserDto {
    const roles = (user.roles ?? []).map((role) => role.key);
    const permissions = [
      ...new Set((user.roles ?? []).flatMap((role) => (role.permissions ?? []).map((p) => p.key))),
    ].sort();

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name ?? '',
      roles,
      permissions,
    };
  }
}
