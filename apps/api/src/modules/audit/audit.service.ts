import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageDto, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  async list(tenantId: string, query: PaginationQueryDto): Promise<PageDto<AuditLog>> {
    const qb = this.logs.createQueryBuilder('a').where('a.tenant_id = :tenantId', { tenantId });

    if (query.search) {
      qb.andWhere('(a.action ILIKE :search OR a.actor_email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [data, total] = await qb
      .orderBy('a.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.pageSize)
      .getManyAndCount();

    return new PageDto(data, total, query);
  }
}
