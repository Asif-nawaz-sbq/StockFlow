/**
 * Injection token lives on its own so redis.service.ts can import it without
 * importing redis.module.ts, which imports the service back.
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
