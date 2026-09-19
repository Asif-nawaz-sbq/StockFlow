import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { RoleKey } from 'src/modules/rbac/entities/role.entity';
import { UserStatus } from '../entities/user.entity';

export class InviteUserDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Length(2, 160)
  fullName: string;

  @ApiProperty({ enum: RoleKey, isArray: true })
  @IsArray()
  @ArrayMinSize(1, { message: 'A member needs at least one role' })
  @IsEnum(RoleKey, { each: true })
  roles: RoleKey[];
}

export class UpdateUserRolesDto {
  @ApiProperty({ enum: RoleKey, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(RoleKey, { each: true })
  roles: RoleKey[];
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class UserListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiProperty({ enum: UserStatus }) status: UserStatus;
  @ApiProperty({ isArray: true, type: String }) roles: string[];
  @ApiPropertyOptional() lastLoginAt: Date | null;
}
