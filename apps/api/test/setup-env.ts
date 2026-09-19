/**
 * Integration tests run against a throwaway database on the same local
 * Postgres as dev. Anything already in TEST_DATABASE_URL wins, so CI can
 * point at its own service container.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://stockflow:stockflow_local_pw@localhost:5432/stockflow_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/1';
process.env.DB_SSL_DISABLED = 'true';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_000000000000000000000000000000';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_00000000000000000000000000000';
process.env.LOG_LEVEL = 'silent';
process.env.CORS_ORIGINS = 'http://localhost:3000';
