export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  tenantId: string;
  tenantName: string;
  roles: string[];
  permissions: string[];
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  city: string;
  postalCode: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  ean: string | null;
  unit: string;
  sellPriceCents: number;
  currency: string;
  vatRate: string;
  reorderPoint: number;
  reorderQuantity: number;
  isActive: boolean;
  totalOnHand?: number;
  totalReserved?: number;
  totalAvailable?: number;
}

export interface StockLevel {
  id: string;
  productId: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  onOrder: number;
  lastMovementAt: string | null;
  warehouse?: Warehouse;
}

export interface StockMovement {
  id: string;
  type: string;
  qtyDelta: number;
  balanceAfter: number;
  unitCostCents: number | null;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  occurredAt: string;
  warehouse?: Warehouse;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  email: string | null;
  billingCity: string;
  creditLimitCents: number;
  paymentTermsDays: number;
  isActive: boolean;
}

export type SalesOrderStatus = 'draft' | 'confirmed' | 'picked' | 'shipped' | 'cancelled';

export interface SalesOrderLine {
  id: string;
  productId: string;
  qty: number;
  allocatedQty: number;
  unitPriceCents: number;
  discountPercent: string;
  vatRate: string;
  netCents: number;
  vatCents: number;
  grossCents: number;
  product?: Product;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  status: SalesOrderStatus;
  currency: string;
  subtotalCents: number;
  vatTotalCents: number;
  grandTotalCents: number;
  placedAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  notes: string | null;
  customer?: Customer;
  warehouse?: Warehouse;
  lines?: SalesOrderLine[];
}

export type PurchaseOrderStatus =
  'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrderLine {
  id: string;
  productId: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCostCents: number;
  product?: Product;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  currency: string;
  subtotalCents: number;
  expectedAt: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  supplier?: { id: string; name: string; code: string; leadTimeDays: number };
  warehouse?: Warehouse;
  lines?: PurchaseOrderLine[];
}

export interface DashboardSummary {
  stockValueCents: number;
  distinctSkusInStock: number;
  lowStockCount: number;
  openOrderCount: number;
  openOrderValueCents: number;
  shippedThisMonthCount: number;
  shippedThisMonthValueCents: number;
  revenueTrend: Array<{ date: string; netCents: number }>;
  topProducts: Array<{
    sku: string;
    name: string;
    unitsShipped: number;
    netCents: number;
  }>;
  generatedAt: string;
}

export interface RecentMovement {
  id: string;
  occurredAt: string;
  type: string;
  qtyDelta: number;
  balanceAfter: number;
  sku: string;
  productName: string;
  warehouseCode: string;
}

export interface ReplenishmentSuggestion {
  productId: string;
  sku: string;
  name: string;
  warehouseId: string;
  warehouseCode: string;
  onHand: number;
  reserved: number;
  onOrder: number;
  available: number;
  projected: number;
  reorderPoint: number;
  suggestedQty: number;
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
  leadTimeDays: number | null;
  estimatedCostCents: number | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}
