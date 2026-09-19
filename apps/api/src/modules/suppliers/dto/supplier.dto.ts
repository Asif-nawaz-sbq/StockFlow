import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

export class CreateSupplierDto {
  @ApiProperty({ example: 'LIEF-012' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(2, 16)
  code: string;

  @ApiProperty({ example: 'Rösterei Kaffeekontor Hamburg GmbH' })
  @IsString()
  @Length(2, 160)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(5, 40)
  contactPhone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(4, 32)
  vatId?: string;

  @ApiPropertyOptional({
    default: 7,
    description: 'Working days from PO sent to delivery',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  leadTimeDays?: number;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  paymentTermsDays?: number;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 160)
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(5, 40)
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  leadTimeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  paymentTermsDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class QuerySuppliersDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
