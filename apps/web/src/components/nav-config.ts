import {
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ScrollText,
  ShoppingCart,
  TrendingDown,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard:read',
      },
    ],
  },
  {
    label: 'Inventory',
    items: [
      {
        href: '/dashboard/products',
        label: 'Products',
        icon: Package,
        permission: 'products:read',
      },
      {
        href: '/dashboard/replenishment',
        label: 'Replenishment',
        icon: TrendingDown,
        permission: 'inventory:read',
      },
    ],
  },
  {
    label: 'Documents',
    items: [
      {
        href: '/dashboard/orders',
        label: 'Sales orders',
        icon: ShoppingCart,
        permission: 'sales_orders:read',
      },
      {
        href: '/dashboard/purchase-orders',
        label: 'Purchase orders',
        icon: ClipboardList,
        permission: 'purchase_orders:read',
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        href: '/dashboard/audit',
        label: 'Audit log',
        icon: ScrollText,
        permission: 'audit:read',
      },
    ],
  },
];

/** Drives the topbar heading; longest matching prefix wins so detail routes inherit it. */
export const ROUTE_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: '/dashboard/products', title: 'Products' },
  { prefix: '/dashboard/orders', title: 'Sales orders' },
  { prefix: '/dashboard/purchase-orders', title: 'Purchase orders' },
  { prefix: '/dashboard/replenishment', title: 'Replenishment' },
  { prefix: '/dashboard/audit', title: 'Audit log' },
  { prefix: '/dashboard', title: 'Dashboard' },
];
