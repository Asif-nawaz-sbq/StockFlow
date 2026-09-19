import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() tenantName: string;
  @ApiProperty({ isArray: true, type: String }) roles: string[];
  @ApiProperty({ isArray: true, type: String }) permissions: string[];
}

export class LoginResponseDto {
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
  @ApiProperty({ description: 'Seconds until the access cookie expires' })
  expiresIn: number;
}
