import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'node:path';
import { resolveDatabaseConnection, resolveDatabaseSsl } from './connection';

loadDotenv();

const compiled = __filename.endsWith('.js');
const ext = compiled ? 'js' : 'ts';
const root = join(__dirname, '..');

/**
 * Shared by the Nest TypeORM module and the CLI. synchronize is hardcoded off -
 * schema changes only ever land through a reviewed migration file.
 */
const connection = resolveDatabaseConnection();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: connection.host,
  port: connection.port,
  username: connection.username,
  password: connection.password,
  database: connection.database,
  entities: [join(root, '**', '*.entity.' + ext)],
  migrations: [join(root, 'database', 'migrations', '*.' + ext)],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true' ? 'all' : ['error', 'warn', 'migration'],
  ssl: resolveDatabaseSsl(),
  extra: {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    // Fargate tasks get recycled; don't let the pool outlive an RDS failover.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  },
};

export default new DataSource(dataSourceOptions);
