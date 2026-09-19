import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKey } from 'src/common/entities/idempotency-key.entity';
import { InventoryModule } from 'src/modules/inventory/inventory.module';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderLine, IdempotencyKey]),
    InventoryModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
