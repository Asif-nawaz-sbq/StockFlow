import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

export class PurchaseOrderLineDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qtyOrdered: number;

  @ApiPropertyOptional({
    description: 'Defaults to the supplier cost on the product link',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCostCents?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  supplierId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional({ example: '2026-09-15' })
  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @ApiProperty({ type: [PurchaseOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines: PurchaseOrderLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ReceiptLineDto {
  @ApiProperty({ format: 'uuid', description: 'Purchase order line id' })
  @IsUUID()
  lineId: string;

  @ApiProperty({ minimum: 1, description: 'Units received in this delivery' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;
}

export class ReceiveGoodsDto {
  @ApiProperty({ type: [ReceiptLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineDto)
  lines: ReceiptLineDto[];

  @ApiPropertyOptional({ description: 'Supplier delivery note number' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  deliveryNote?: string;
}

export class QueryPurchaseOrdersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;
}
