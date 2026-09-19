import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SalesOrderLineDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;

  @ApiPropertyOptional({
    description: 'Overrides the product list price. Requires sales_orders:override_price.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPriceCents?: number;

  @ApiPropertyOptional({ example: '5.00', description: 'Percent, 0-100' })
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  discountPercent?: string;
}

export class CreateSalesOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ type: [SalesOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'An order needs at least one line' })
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  lines: SalesOrderLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CancelSalesOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
