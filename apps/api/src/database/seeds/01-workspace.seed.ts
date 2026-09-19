import { DataSource } from 'typeorm';
import { AuthService } from 'src/modules/auth/auth.service';
import { Role, RoleKey } from 'src/modules/rbac/entities/role.entity';
import { Tenant, TenantPlan } from 'src/modules/tenants/entities/tenant.entity';
import { User, UserStatus } from 'src/modules/users/entities/user.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';

export interface WorkspaceSeedResult {
  tenant: Tenant;
  warehouses: Warehouse[];
  users: User[];
}

const STAFF = [
  {
    fullName: 'Andrea Brenner',
    localPart: 'a.brenner',
    role: RoleKey.OWNER,
    daysSinceLogin: 0,
  },
  {
    fullName: 'Tim Osterkamp',
    localPart: 't.osterkamp',
    role: RoleKey.OPS_MANAGER,
    daysSinceLogin: 1,
  },
  {
    fullName: 'Dilara Ünal',
    localPart: 'd.uenal',
    role: RoleKey.WAREHOUSE_CLERK,
    daysSinceLogin: 0,
  },
  {
    fullName: 'Hendrik Voss',
    localPart: 'h.voss',
    role: RoleKey.VIEWER,
    daysSinceLogin: 6,
  },
];

const WAREHOUSES = [
  {
    code: 'DUS-01',
    name: 'Central Warehouse Düsseldorf',
    addressLine1: 'Fringsstraße 14',
    postalCode: '40221',
    city: 'Düsseldorf',
  },
  {
    code: 'HAM-02',
    name: 'Satellite Warehouse Hamburg Port',
    addressLine1: 'Am Sandtorkai 62',
    postalCode: '20457',
    city: 'Hamburg',
  },
];

/**
 * All four staff accounts share one password so the demo is usable without a
 * credential list. Fine for a local seed - the AWS environments never run this
 * seeder, they get an owner account provisioned from Secrets Manager instead.
 */
export async function seedWorkspace(
  dataSource: DataSource,
  roles: Map<RoleKey, Role>,
): Promise<WorkspaceSeedResult> {
  const tenantRepo = dataSource.getRepository(Tenant);
  const warehouseRepo = dataSource.getRepository(Warehouse);
  const userRepo = dataSource.getRepository(User);

  const tenant = await tenantRepo.save(
    tenantRepo.create({
      slug: 'nordmann-handel',
      name: 'Nordmann Handel GmbH',
      vatId: 'DE297114508',
      country: 'DE',
      plan: TenantPlan.STANDARD,
      defaultCurrency: 'EUR',
      isActive: true,
    }),
  );

  const warehouses = await warehouseRepo.save(
    WAREHOUSES.map((w) => warehouseRepo.create({ ...w, tenantId: tenant.id, country: 'DE' })),
  );

  const password = process.env.SEED_OWNER_PASSWORD ?? 'Sommer2026!';
  const passwordHash = await AuthService.hashPassword(password);
  const domain = 'nordmann-handel.de';

  const users: User[] = [];
  for (const staff of STAFF) {
    const lastLoginAt = new Date();
    lastLoginAt.setUTCDate(lastLoginAt.getUTCDate() - staff.daysSinceLogin);

    users.push(
      await userRepo.save(
        userRepo.create({
          tenantId: tenant.id,
          email: `${staff.localPart}@${domain}`,
          fullName: staff.fullName,
          passwordHash,
          status: UserStatus.ACTIVE,
          lastLoginAt,
          roles: [roles.get(staff.role) as Role],
        }),
      ),
    );
  }

  return { tenant, warehouses, users };
}
