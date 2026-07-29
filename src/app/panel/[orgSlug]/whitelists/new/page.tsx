import { notFound } from "next/navigation";
import { verifySession, getOrgBySlug, getOrgRole } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";
import { NewWhitelistForm } from "./NewWhitelistForm";

export default async function NewWhitelistPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { userId } = await verifySession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const role = await getOrgRole(org.id, userId);
  if (!canManageOrg(role)) notFound();

  return (
    <div className="max-w-md">
      <h1 className="font-heading text-2xl font-semibold tracking-tight mb-6">Nueva whitelist</h1>
      <NewWhitelistForm organizationId={org.id} orgSlug={org.slug} />
    </div>
  );
}
