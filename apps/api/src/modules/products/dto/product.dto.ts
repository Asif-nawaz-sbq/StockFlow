import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ProductUnit, VatRate } from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'NH-KAF-1000' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(3, 40)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'SKU may only contain A-Z, 0-9 and dashes',
  })
  sku: string;

  @ApiProperty()
  @IsString()
  @Length(2, 200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty()
  @IsString()
  @Length(2, 80)
  category: string;

  @ApiPropertyOptional({ example: '4006381333931' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$|^\d{13}$/, { message: 'EAN must be 8 or 13 digits' })
  ean?: string;

  @ApiProperty({ enum: ProductUnit })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiProperty({ description: 'Net price in cents, excluding VAT' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sellPriceCents: number;

  @ApiProperty({ enum: VatRate, example: '19.00' })
  @IsIn(Object.values(VatRate), {
    message: 'VAT rate must be one of 19.00, 7.00, 0.00',
  })
  vatRate: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  weightGrams?: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 80)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sellPriceCents?: number;

  @ApiPropertyOptional({ enum: VatRate })
  @IsOptional()
  @IsIn(Object.values(VatRate))
  vatRate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryProductsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ description: 'Omit to see both active and archived' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ['sku', 'name', 'sellPriceCents', 'createdAt'] })
  @IsOptional()
  @IsIn(['sku', 'name', 'sellPriceCents', 'createdAt'])
  sortBy: 'sku' | 'name' | 'sellPriceCents' | 'createdAt' = 'sku';
}
