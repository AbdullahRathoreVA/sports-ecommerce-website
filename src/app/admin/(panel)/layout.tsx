import { requireAdminPage, can, type Permission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { AdminShell, type NavKey } from "@/components/admin/shell";

export const dynamic = "force-dynamic";

const NAV_PERMISSION: Record<NavKey, Permission> = {
  overview: "viewDashboard",
  live: "viewAnalytics",
  analytics: "viewAnalytics",
  orders: "manageOrders",
  leads: "manageLeads",
  customers: "viewCustomers",
  products: "manageProducts",
  content: "manageContent",
  ai: "useAdminAi",
  audit: "viewAudit",
  users: "manageUsers",
};

/**
 * The authoritative gate for every admin page: re-validates the session
 * against the database (active account, current tokenVersion) on each
 * request. The proxy only did a cheap signature check.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const [settings, newLeads, pendingOrders] = await Promise.all([
    getSettings(),
    can(admin.role, "manageLeads") ? db.lead.count({ where: { status: "NEW" } }) : Promise.resolve(0),
    can(admin.role, "manageOrders") ? db.order.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
  ]);
  const allowed = (Object.keys(NAV_PERMISSION) as NavKey[]).filter((k) => can(admin.role, NAV_PERMISSION[k]));
  return (
    <AdminShell allowed={allowed} admin={admin} brand={settings.brand.name} badges={{ leads: newLeads, orders: pendingOrders }}>
      {children}
    </AdminShell>
  );
}
