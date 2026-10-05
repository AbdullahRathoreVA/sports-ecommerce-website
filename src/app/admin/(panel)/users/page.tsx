import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, Badge, th, td } from "@/components/admin/ui";
import { NewUserForm, UserRowControls } from "./controls";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin users" };

export default async function UsersPage() {
  const admin = await requireAdminPage("manageUsers");
  const users = await db.adminUser.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, lockedUntil: true, failedLogins: true, createdAt: true },
  });

  return (
    <>
      <PageHeader title="Admin users" description="Who can sign in to this admin and what each person can do. Every change here is written to the audit log." />
      <Card title="Add a team member" className="mb-6">
        <NewUserForm />
      </Card>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border hairline bg-surface">
        <table className="w-full min-w-[860px]">
          <thead className="border-b hairline">
            <tr>
              <th className={th}>Person</th>
              <th className={th}>Status</th>
              <th className={th}>Last sign-in</th>
              <th className={th}>Manage</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b hairline last:border-0">
                <td className={td}>
                  <span className="font-medium">{u.name}</span>
                  {u.id === admin.id && <Badge tone="accent" className="ml-2">you</Badge>}
                  <span className="block text-xs text-subtle">{u.email}</span>
                </td>
                <td className={td}>
                  {!u.active ? (
                    <Badge tone="bad">Deactivated</Badge>
                  ) : u.lockedUntil && u.lockedUntil > new Date() ? (
                    <Badge tone="warn">Locked · {u.failedLogins} failed</Badge>
                  ) : (
                    <Badge tone="good">Active</Badge>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap text-muted`}>{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                <td className={td}>
                  <UserRowControls id={u.id} role={u.role} active={u.active} isSelf={u.id === admin.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
