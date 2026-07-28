import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession, getOrgBySlug, getOrgRole } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";
import { MembersClient } from "./MembersClient";

export default async function MembersPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { userId } = await verifySession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const role = await getOrgRole(org.id, userId);
  if (!canManageOrg(role)) notFound();

  const [members, invites] = await Promise.all([
    prisma.orgMember.findMany({
      where: { organizationId: org.id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orgInvite.findMany({
      where: { organizationId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold mb-6">Miembros</h1>
      <MembersClient
        organizationId={org.id}
        members={members}
        invites={invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() }))}
        currentUserId={userId}
      />
    </div>
  );
}
