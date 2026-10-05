import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { PageHeader, Card } from "@/components/admin/ui";
import { ChangePasswordForm } from "../users/controls";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const admin = await requireAdminPage();
  return (
    <>
      <PageHeader title="Your account" description={`${admin.name} · ${admin.email} · ${admin.role.charAt(0) + admin.role.slice(1).toLowerCase()}`} />
      <Card title="Change password" className="max-w-3xl">
        <ChangePasswordForm />
      </Card>
    </>
  );
}
