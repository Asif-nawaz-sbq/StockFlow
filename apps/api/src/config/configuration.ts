import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  DEVELOPMENT = 'development',
  TEST = 'test',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Fail fast on bad config. An ECS task with a missing secret should die during
 * startup and fail its health check, not serve 500s for an hour.
 */
export class EnvSchema {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3001;

  /**
   * Optional because ECS supplies the parts separately - the password comes
   * from Secrets Manager and cannot be interpolated into a URL inside a task
   * definition. resolveDatabaseConnection() enforces that one shape or the
   * other is complete and throws at boot if neither is.
   */
  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 chars' })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 chars' })
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_ACCESS_TTL = '15m';

  @IsString()
  JWT_REFRESH_TTL = '7d';

  @IsString()
  COOKIE_DOMAIN = 'localhost';

  @IsBooleanString()
  COOKIE_SECURE = 'false';

  @IsString()
  CORS_ORIGINS = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  LOG_LEVEL = 'info';

  @IsInt()
  RATE_LIMIT_TTL = 60;

  @IsInt()
  RATE_LIMIT_LIMIT = 120;

  /** Only true for local docker compose - RDS certs are validated in AWS. */
  @IsBooleanString()
  @IsOptional()
  DB_SSL_DISABLED = 'true';
}

export function validateEnv(raw: Record<string, unknown>): EnvSchema {
  const numericKeys = ['PORT', 'RATE_LIMIT_TTL', 'RATE_LIMIT_LIMIT'];
  const coerced: Record<string, unknown> = { ...raw };
  for (const key of numericKeys) {
    if (coerced[key] !== undefined && coerced[key] !== '') {
      coerced[key] = Number(coerced[key]);
    }
  }

  const config = plainToInstance(EnvSchema, coerced, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });

  const errors = validateSync(config, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `  ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${detail}`);
  }

  return config;
}

export const appConfig = () => ({
  env: process.env.NODE_ENV as NodeEnv,
  port: Number(process.env.PORT ?? 3001),
  isProduction: process.env.NODE_ENV === NodeEnv.PRODUCTION,
  cors: {
    origins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN ?? 'localhost',
    secure: process.env.COOKIE_SECURE === 'true',
  },
  rateLimit: {
    ttl: Number(process.env.RATE_LIMIT_TTL ?? 60),
    limit: Number(process.env.RATE_LIMIT_LIMIT ?? 120),
  },
});
