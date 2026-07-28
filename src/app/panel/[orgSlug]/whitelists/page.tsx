import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession, getOrgBySlug, getOrgRole } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  ARCHIVED: "Archivada",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "text-neutral-400",
  OPEN: "text-green-400",
  CLOSED: "text-amber-400",
  ARCHIVED: "text-neutral-600",
};

export default async function WhitelistsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { userId } = await verifySession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const role = await getOrgRole(org.id, userId);
  if (!role) notFound();
  const canManage = canManageOrg(role);

  const whitelists = await prisma.whitelist.findMany({
    where: { organizationId: org.id },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Whitelists</h1>
        {canManage && (
          <Link
            href={`/panel/${org.slug}/whitelists/new`}
            className="bg-violet-600 rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + Nueva whitelist
          </Link>
        )}
      </div>

      {whitelists.length === 0 ? (
        <p className="text-sm text-neutral-500">Aún no hay whitelists. Crea la primera.</p>
      ) : (
        <ul className="divide-y divide-neutral-800 border border-neutral-800 rounded-lg">
          {whitelists.map((w) => (
            <li key={w.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{w.name}</p>
                <p className="text-xs text-neutral-500">
                  <span className="font-mono">{w.code}</span> · {w._count.applications} postulaciones
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium uppercase ${STATUS_COLOR[w.status]}`}>
                  {STATUS_LABEL[w.status]}
                </span>
                <Link
                  href={`/panel/${org.slug}/whitelists/${w.id}/applications`}
                  className="text-sm text-neutral-300 hover:text-white"
                >
                  Postulaciones
                </Link>
                {canManage && (
                  <Link
                    href={`/panel/${org.slug}/whitelists/${w.id}/builder`}
                    className="text-sm text-neutral-300 hover:text-white"
                  >
                    Editor
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
