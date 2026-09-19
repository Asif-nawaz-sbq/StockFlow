import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { IdempotencyKey } from './common/entities/idempotency-key.entity';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { appConfig, validateEnv } from './config/configuration';
import { dataSourceOptions } from './database/data-source';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProductsModule } from './modules/products/products.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { ReplenishmentModule } from './modules/replenishment/replenishment.module';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      validate: validateEnv,
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        // CloudWatch parses JSON out of the box; pretty printing is dev-only.
        transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
        genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
        autoLogging: {
          ignore: (req) => (req.url ?? '').startsWith('/health'),
        },
        redact: {
          paths: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.body.password',
            'res.headers["set-cookie"]',
          ],
          remove: true,
        },
      },
    }),

    TypeOrmModule.forRoot({ ...dataSourceOptions, autoLoadEntities: false }),
    TypeOrmModule.forFeature([IdempotencyKey]),

    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL ?? 60) * 1000,
        limit: Number(process.env.RATE_LIMIT_LIMIT ?? 120),
      },
    ]),

    RedisModule,

    TenantsModule,
    RbacModule,
    AuditModule,
    AuthModule,
    UsersModule,
    WarehousesModule,
    SuppliersModule,
    CustomersModule,
    ProductsModule,
    InventoryModule,
    SalesOrdersModule,
    PurchaseOrdersModule,
    ReplenishmentModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Order matters: throttle, then authenticate, then authorise.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
