import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';
import { MovementType } from '../entities/stock-movement.entity';

/** Manual movements only. Order-driven movements go through the order services. */
const MANUAL_TYPES = [MovementType.ADJUSTMENT, MovementType.RETURN, MovementType.SCRAP] as const;

export class AdjustStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ enum: MANUAL_TYPES })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ description: 'Signed. Negative removes stock.' })
  @Type(() => Number)
  @IsInt()
  @NotEquals(0, { message: 'qtyDelta cannot be zero' })
  qtyDelta: number;

  @ApiProperty({
    description: 'Required - adjustments without a reason are unauditable',
  })
  @IsString()
  @MaxLength(500)
  note: string;
}

export class StockQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({
    description: 'Only rows at or below the product reorder point',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  belowReorderPoint?: number;
}
