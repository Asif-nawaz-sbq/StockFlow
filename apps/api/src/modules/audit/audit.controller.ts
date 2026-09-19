import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions, TenantId } from 'src/common/decorators';
import { PageDto, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

@ApiTags('audit')
@ApiCookieAuth()
@Controller({ path: 'audit-logs', version: '1' })
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Who changed what, newest first' })
  list(
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PageDto<AuditLog>> {
    return this.service.list(tenantId, query);
  }
}
