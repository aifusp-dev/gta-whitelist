import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession, getOrgBySlug, getOrgRole } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";

export default async function WhitelistLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const { userId } = await verifySession();

  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const role = await getOrgRole(org.id, userId);
  if (!role) notFound();

  const whitelist = await prisma.whitelist.findUnique({ where: { id } });
  // Aislamiento de tenant: aunque el usuario tenga acceso a `org`, la whitelist
  // debe pertenecer realmente a esa organización (si no, alguien está
  // adivinando/reutilizando un id de otra org).
  if (!whitelist || whitelist.organizationId !== org.id) notFound();

  const canManage = canManageOrg(role);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/panel/${org.slug}/whitelists`} className="text-xs text-neutral-500 hover:text-neutral-300">
          ← Whitelists
        </Link>
        <h1 className="text-xl font-bold mt-1">{whitelist.name}</h1>
        <p className="text-xs text-neutral-500 font-mono">{whitelist.code}</p>
      </div>

      <nav className="flex items-center gap-1 text-sm border-b border-neutral-800">
        {canManage && (
          <Link
            href={`/panel/${org.slug}/whitelists/${whitelist.id}/builder`}
            className="px-3 py-2 text-neutral-300 hover:text-white transition-colors"
          >
            Editor
          </Link>
        )}
        <Link
          href={`/panel/${org.slug}/whitelists/${whitelist.id}/applications`}
          className="px-3 py-2 text-neutral-300 hover:text-white transition-colors"
        >
          Postulaciones
        </Link>
      </nav>

      {children}
    </div>
  );
}
