import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'Password needs a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'Password needs an uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password needs a digit' })
  newPassword: string;
}
