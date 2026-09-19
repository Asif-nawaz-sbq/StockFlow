import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

export class CreateCustomerDto {
  @ApiProperty({ example: 'KND-0042' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(2, 16)
  code: string;

  @ApiProperty({ example: 'Feinkost Wagner GmbH' })
  @IsString()
  @Length(2, 160)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(5, 40)
  phone?: string;

  @ApiPropertyOptional({ example: 'DE811907980' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}[A-Z0-9]{2,30}$/, {
    message: 'VAT ID must look like DE123456789',
  })
  vatId?: string;

  @ApiProperty()
  @IsString()
  @Length(3, 160)
  billingAddressLine1: string;

  @ApiProperty({ example: '40213' })
  @IsString()
  @Length(4, 16)
  billingPostalCode: string;

  @ApiProperty({ example: 'Düsseldorf' })
  @IsString()
  @Length(2, 80)
  billingCity: string;

  @ApiPropertyOptional({ default: 'DE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  billingCountry?: string;

  @ApiPropertyOptional({
    description: 'Cents. Zero means no limit.',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditLimitCents?: number;

  @ApiPropertyOptional({ default: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  paymentTermsDays?: number;
}

export class UpdateCustomerDto {
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
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(5, 40)
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 160)
  billingAddressLine1?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(4, 16)
  billingPostalCode?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 80)
  billingCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditLimitCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  paymentTermsDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class QueryCustomersDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
