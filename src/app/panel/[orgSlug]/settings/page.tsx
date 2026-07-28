import { notFound } from "next/navigation";
import { verifySession, getOrgBySlug, getOrgRole } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";
import { SettingsForm } from "./SettingsForm";

export default async function OrgSettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { userId } = await verifySession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const role = await getOrgRole(org.id, userId);
  if (!canManageOrg(role)) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Ajustes</h1>
      <SettingsForm organizationId={org.id} initialName={org.name} />
    </div>
  );
}
