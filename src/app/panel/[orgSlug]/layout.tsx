import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession, getOrgBySlug, getOrgRole, isOrgAccessOverride } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";
import { logout } from "@/app/actions/auth";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { userId } = await verifySession();

  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const role = await getOrgRole(org.id, userId);
  if (!role) notFound();

  const canManage = canManageOrg(role);
  const isOverride = await isOrgAccessOverride(org.id, userId);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/panel" className="font-bold">
              {org.name}
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href={`/panel/${org.slug}/whitelists`}
                className="px-3 py-1.5 rounded-md text-neutral-300 hover:bg-neutral-900 transition-colors"
              >
                Whitelists
              </Link>
              {canManage && (
                <>
                  <Link
                    href={`/panel/${org.slug}/members`}
                    className="px-3 py-1.5 rounded-md text-neutral-300 hover:bg-neutral-900 transition-colors"
                  >
                    Miembros
                  </Link>
                  <Link
                    href={`/panel/${org.slug}/settings`}
                    className="px-3 py-1.5 rounded-md text-neutral-300 hover:bg-neutral-900 transition-colors"
                  >
                    Ajustes
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-400">
            <Link href="/apply" className="hover:text-neutral-200 transition-colors">
              Mis postulaciones
            </Link>
            <form action={logout}>
              <button type="submit" className="hover:text-neutral-200 transition-colors">
                Salir
              </button>
            </form>
          </div>
        </div>
        {isOverride && (
          <div className="bg-amber-950/50 border-t border-amber-900/50 text-amber-300 text-xs text-center py-1.5">
            Estás gestionando esta organización en modo soporte (no eres miembro).
          </div>
        )}
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  );
}
