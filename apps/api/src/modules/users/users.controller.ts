import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audited, RequirePermissions, TenantId } from 'src/common/decorators';
import {
  InviteUserDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
  UserListItemDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Workspace members with their roles' })
  list(@TenantId() tenantId: string): Promise<UserListItemDto[]> {
    return this.service.list(tenantId);
  }

  @Post()
  @RequirePermissions('users:write')
  @Audited('user.invite')
  @ApiOperation({ summary: 'Add a member (no email is sent in this build)' })
  invite(@TenantId() tenantId: string, @Body() dto: InviteUserDto): Promise<UserListItemDto> {
    return this.service.invite(tenantId, dto);
  }

  @Patch(':id/roles')
  @RequirePermissions('users:write')
  @Audited('user.set_roles')
  setRoles(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRolesDto,
  ): Promise<UserListItemDto> {
    return this.service.setRoles(tenantId, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('users:write')
  @Audited('user.set_status')
  setStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<UserListItemDto> {
    return this.service.setStatus(tenantId, id, dto.status);
  }
}
