import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { SalesOrderStatus } from '../entities/sales-order.entity';

export class QuerySalesOrdersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SalesOrderStatus })
  @IsOptional()
  @IsEnum(SalesOrderStatus)
  status?: SalesOrderStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ enum: ['placedAt', 'grandTotalCents', 'orderNumber'] })
  @IsOptional()
  @IsIn(['placedAt', 'grandTotalCents', 'orderNumber'])
  sortBy: 'placedAt' | 'grandTotalCents' | 'orderNumber' = 'placedAt';
}
