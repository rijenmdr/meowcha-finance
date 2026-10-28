import {
  ActivityIcon,
  BookIcon,
  CreditCardIcon,
  FileTextIcon,
  LayersIcon,
  LayoutDashboardIcon,
  ListIcon,
  PackageIcon,
  TagIcon,
  TargetIcon,
  TruckIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Grouped by task: the at-a-glance view, money moving day to day, what's for
// sale, then the reference lists that feed those screens.
export const NAV_SECTIONS: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [{ href: "/overview", label: "Overview", icon: LayoutDashboardIcon }] },
  {
    label: "Money",
    items: [
      { href: "/orders", label: "Orders", icon: PackageIcon },
      { href: "/transactions", label: "Transactions", icon: ListIcon },
      { href: "/invoices", label: "Invoices", icon: FileTextIcon },
      { href: "/budget", label: "Budget", icon: TargetIcon },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/products", label: "Products", icon: BookIcon },
      { href: "/product-categories", label: "Product categories", icon: LayersIcon },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/customers", label: "Customers", icon: UsersIcon },
      { href: "/categories", label: "Transaction categories", icon: TagIcon },
      { href: "/channels", label: "Channels", icon: ActivityIcon },
      { href: "/sources", label: "Sources", icon: WalletIcon },
      { href: "/delivery-providers", label: "Delivery providers", icon: TruckIcon },
      { href: "/payment-methods", label: "Payment methods", icon: CreditCardIcon },
    ],
  },
];
