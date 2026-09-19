/** Every key is tenant-prefixed so one workspace can never read another's cache. */
export const cacheKeys = {
  dashboardSummary: (tenantId: string) => `t:${tenantId}:dashboard:summary`,
  lowStock: (tenantId: string) => `t:${tenantId}:dashboard:low-stock`,
  replenishment: (tenantId: string) => `t:${tenantId}:replenishment`,
  stockLevel: (tenantId: string, productId: string, warehouseId: string) =>
    `t:${tenantId}:stock:${productId}:${warehouseId}`,
  userPermissions: (userId: string) => `u:${userId}:permissions`,
  refreshToken: (jti: string) => `rt:${jti}`,

  /** Wildcards used on invalidation after any stock movement. */
  tenantInventoryPattern: (tenantId: string) => `t:${tenantId}:stock:*`,
  tenantDashboardPattern: (tenantId: string) => `t:${tenantId}:dashboard:*`,
} as const;

export const cacheTtl = {
  dashboard: 60,
  replenishment: 120,
  stockLevel: 30,
  permissions: 300,
} as const;
