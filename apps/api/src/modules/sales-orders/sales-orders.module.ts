import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKey } from 'src/common/entities/idempotency-key.entity';
import { InventoryModule } from 'src/modules/inventory/inventory.module';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesOrder, SalesOrderLine, IdempotencyKey]),
    InventoryModule,
  ],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
