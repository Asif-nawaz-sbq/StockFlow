import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DuplicateResourceError } from 'src/common/errors/domain.errors';
import { Role, RoleKey } from 'src/modules/rbac/entities/role.entity';
import { Tenant, TenantPlan } from 'src/modules/tenants/entities/tenant.entity';
import { User, UserStatus } from 'src/modules/users/entities/user.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

/** Trimmed to 48 chars so the slug stays readable if the company name is long. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /**
   * Self-service workspace creation.
   *
   * Everything lands in one transaction: a half-created tenant with no owner
   * would be unreachable and unfixable through the UI. A starter warehouse is
   * included because almost nothing in the app works without one, and making a
   * new user find that out on their first order is a poor welcome.
   */
  async register(dto: RegisterDto): Promise<{ tenantId: string; userId: string }> {
    const existing = await this.users.findOne({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw new DuplicateResourceError('account', 'email address', dto.email);

    const passwordHash = await AuthService.hashPassword(dto.password);

    return this.dataSource.transaction(async (em) => {
      const slug = await this.uniqueSlug(em.getRepository(Tenant), slugify(dto.companyName));

      const tenant = await em.save(
        em.create(Tenant, {
          slug,
          name: dto.companyName,
          country: 'DE',
          plan: TenantPlan.TRIAL,
          defaultCurrency: 'EUR',
          isActive: true,
        }),
      );

      const ownerRole = await em.findOneOrFail(Role, { where: { key: RoleKey.OWNER } });

      const user = await em.save(
        em.create(User, {
          tenantId: tenant.id,
          email: dto.email,
          fullName: dto.fullName,
          passwordHash,
          status: UserStatus.ACTIVE,
          roles: [ownerRole],
        }),
      );

      await em.save(
        em.create(Warehouse, {
          tenantId: tenant.id,
          code: 'MAIN',
          name: 'Main warehouse',
          addressLine1: '—',
          postalCode: '—',
          city: '—',
          country: 'DE',
          isActive: true,
        }),
      );

      this.logger.log({ tenantId: tenant.id, slug }, 'workspace created');
      return { tenantId: tenant.id, userId: user.id };
    });
  }

  /** Two companies can share a name; the slug is what has to stay unique. */
  private async uniqueSlug(repo: Repository<Tenant>, base: string): Promise<string> {
    const candidate = base || 'workspace';
    for (let suffix = 0; suffix < 50; suffix += 1) {
      const slug = suffix === 0 ? candidate : `${candidate}-${suffix + 1}`;
      const clash = await repo.findOne({ where: { slug }, select: { id: true } });
      if (!clash) return slug;
    }
    return `${candidate}-${Date.now().toString(36)}`;
  }
}
