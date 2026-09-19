import { readFileSync } from 'node:fs';

/**
 * Connection settings arrive in two shapes.
 *
 * Locally, docker compose hands over a single DATABASE_URL. On ECS the
 * password lives in Secrets Manager and is injected as its own environment
 * variable, so there is no way to compose a URL in the task definition - the
 * parts arrive separately and get assembled here.
 */
export interface DatabaseConnection {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function resolveDatabaseConnection(): DatabaseConnection {
  const url = process.env.DATABASE_URL;

  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
    };
  }

  const missing = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'].filter(
    (key) => !process.env[key],
  );
  if (missing.length > 0) {
    throw new Error(
      `Database configuration incomplete. Set DATABASE_URL, or all of: ${missing.join(', ')}`,
    );
  }

  return {
    host: process.env.DATABASE_HOST as string,
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER as string,
    password: process.env.DATABASE_PASSWORD as string,
    database: process.env.DATABASE_NAME as string,
  };
}

/**
 * TLS for RDS.
 *
 * `rejectUnauthorized: true` needs the Amazon RDS CA chain, which is not in
 * Node's default trust store. The production image bakes in the global bundle;
 * without it the choice would be between an unverified connection and no
 * connection at all.
 */
export function resolveDatabaseSsl(): false | { ca: string; rejectUnauthorized: boolean } {
  if (process.env.DB_SSL_DISABLED === 'true') return false;

  const caPath = process.env.DB_SSL_CA_FILE ?? '/app/certs/rds-global-bundle.pem';
  return { ca: readFileSync(caPath, 'utf8'), rejectUnauthorized: true };
}

/**
 * Redis, same story: local compose provides REDIS_URL, ECS provides host, port
 * and an AUTH token pulled from Secrets Manager.
 */
export function resolveRedisUrl(): string {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;

  const host = process.env.REDIS_HOST;
  if (!host) {
    throw new Error('Redis configuration incomplete. Set REDIS_URL, or REDIS_HOST.');
  }

  const port = process.env.REDIS_PORT ?? '6379';
  const token = process.env.REDIS_AUTH_TOKEN;
  // ElastiCache has transit encryption on, so the scheme must be rediss://.
  const scheme = process.env.REDIS_TLS === 'true' ? 'rediss' : 'redis';
  const auth = token ? `:${encodeURIComponent(token)}@` : '';

  return `${scheme}://${auth}${host}:${port}`;
}
