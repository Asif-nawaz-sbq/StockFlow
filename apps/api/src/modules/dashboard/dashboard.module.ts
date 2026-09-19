import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from 'src/modules/inventory/entities/stock-movement.entity';
import { SalesOrder } from 'src/modules/sales-orders/entities/sales-order.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalesOrder, StockMovement])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
