import { DataSource } from 'typeorm';
import { Permission } from 'src/modules/rbac/entities/permission.entity';
import { Role, RoleKey } from 'src/modules/rbac/entities/role.entity';
import { PERMISSIONS, ROLE_DEFINITIONS } from 'src/modules/rbac/permissions.catalogue';

/**
 * Roles and permissions are reference data, not demo data - this runs on every
 * deploy, not just locally, so it has to be idempotent and additive. Permissions
 * that disappear from the catalogue are left in place rather than deleted; an
 * orphaned row is harmless, a cascading delete of role_permissions is not.
 */
export async function seedRbac(dataSource: DataSource): Promise<Map<RoleKey, Role>> {
  const permissionRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);

  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await permissionRepo.upsert({ key, description }, { conflictPaths: ['key'] });
  }

  const allPermissions = await permissionRepo.find();
  const byKey = new Map(allPermissions.map((p) => [p.key, p]));

  const roles = new Map<RoleKey, Role>();

  for (const [key, definition] of Object.entries(ROLE_DEFINITIONS)) {
    const roleKey = key as RoleKey;

    let role = await roleRepo.findOne({
      where: { key: roleKey },
      relations: { permissions: true },
    });
    if (!role) {
      role = roleRepo.create({
        key: roleKey,
        name: definition.name,
        description: definition.description,
      });
    }

    role.name = definition.name;
    role.description = definition.description;
    role.permissions = definition.permissions
      .map((permissionKey) => byKey.get(permissionKey))
      .filter((p): p is Permission => p !== undefined);

    roles.set(roleKey, await roleRepo.save(role));
  }

  return roles;
}
