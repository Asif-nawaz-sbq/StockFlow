import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'DUS-01' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(2, 16)
  code: string;

  @ApiProperty({ example: 'Zentrallager Düsseldorf' })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiProperty() @IsString() @Length(3, 160) addressLine1: string;
  @ApiProperty({ example: '40468' })
  @IsString()
  @Length(4, 16)
  postalCode: string;
  @ApiProperty({ example: 'Düsseldorf' })
  @IsString()
  @Length(2, 80)
  city: string;

  @ApiPropertyOptional({ default: 'DE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}

export class UpdateWarehouseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 160)
  addressLine1?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(4, 16)
  postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 80) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
