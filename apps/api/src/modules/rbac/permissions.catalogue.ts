import { RoleKey } from './entities/role.entity';

/**
 * Single source of truth for the permission set. The seeder writes this into
 * the permissions and role_permissions tables, and PermissionsGuard checks
 * against what a user's roles resolve to.
 */
export const PERMISSIONS: Record<string, string> = {
  'dashboard:read': 'View the dashboard',

  'products:read': 'View products',
  'products:write': 'Create, edit and archive products',

  'suppliers:read': 'View suppliers',
  'suppliers:write': 'Create and edit suppliers',

  'customers:read': 'View customers',
  'customers:write': 'Create and edit customers',

  'warehouses:read': 'View warehouses',
  'warehouses:write': 'Create and edit warehouses',

  'inventory:read': 'View stock levels and the movement ledger',
  'inventory:adjust': 'Post manual stock corrections',
  'inventory:admin': 'Rebuild running totals from the ledger',

  'sales_orders:read': 'View sales orders',
  'sales_orders:write': 'Create and cancel sales orders',
  'sales_orders:confirm': 'Confirm orders and reserve stock',
  'sales_orders:fulfil': 'Pick and ship orders',
  'sales_orders:override_price': 'Set a line price other than the list price',

  'purchase_orders:read': 'View purchase orders',
  'purchase_orders:write': 'Raise, send and cancel purchase orders',
  'purchase_orders:receive': 'Book goods receipts',

  'users:read': 'View workspace members',
  'users:write': 'Invite members and change their roles',

  'audit:read': 'View the audit log',
};

const READ_ONLY = [
  'dashboard:read',
  'products:read',
  'suppliers:read',
  'customers:read',
  'warehouses:read',
  'inventory:read',
  'sales_orders:read',
  'purchase_orders:read',
];

export const ROLE_DEFINITIONS: Record<
  RoleKey,
  { name: string; description: string; permissions: string[] }
> = {
  [RoleKey.OWNER]: {
    name: 'Owner',
    description: 'Full access including workspace members and the audit log',
    permissions: Object.keys(PERMISSIONS),
  },
  [RoleKey.OPS_MANAGER]: {
    name: 'Operations Manager',
    description: 'Runs day-to-day trading: pricing, orders, purchasing',
    permissions: [
      ...READ_ONLY,
      'products:write',
      'suppliers:write',
      'customers:write',
      'inventory:adjust',
      'sales_orders:write',
      'sales_orders:confirm',
      'sales_orders:fulfil',
      'sales_orders:override_price',
      'purchase_orders:write',
      'purchase_orders:receive',
      'audit:read',
    ],
  },
  [RoleKey.WAREHOUSE_CLERK]: {
    name: 'Warehouse Clerk',
    description: 'Moves stock and fulfils orders, but cannot change prices',
    permissions: [
      ...READ_ONLY,
      'inventory:adjust',
      'sales_orders:fulfil',
      'purchase_orders:receive',
    ],
  },
  [RoleKey.VIEWER]: {
    name: 'Viewer',
    description: 'Read-only access for finance and reporting',
    permissions: READ_ONLY,
  },
};
