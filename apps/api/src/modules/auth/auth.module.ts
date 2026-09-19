import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from 'src/modules/rbac/entities/role.entity';
import { Tenant } from 'src/modules/tenants/entities/tenant.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RegistrationService } from './registration.service';
import { TokenService } from './token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, Role, Warehouse]),
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    // Secrets are passed per-sign call because access and refresh use different keys.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtStrategy, RegistrationService],
  exports: [AuthService, TokenService, RegistrationService],
})
export class AuthModule {}
