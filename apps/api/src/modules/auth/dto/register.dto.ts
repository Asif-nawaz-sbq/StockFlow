import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Northwind Provisions Ltd' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 160)
  companyName: string;

  @ApiProperty({ example: 'Alex Rivera' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 160)
  fullName: string;

  @ApiProperty({ example: 'alex@northwind-provisions.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'Password needs a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'Password needs an uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password needs a digit' })
  password: string;
}
