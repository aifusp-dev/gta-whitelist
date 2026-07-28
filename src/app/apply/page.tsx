import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifySession, getCurrentUser, listMyOrganizations } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { StartApplicationForm } from "./StartApplicationForm";

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "En progreso",
  SUBMITTED: "Enviada",
  IN_REVIEW: "En revisión",
  INTERVIEW: "Entrevista",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

export default async function ApplyPage() {
  const { userId } = await verifySession();
  const [user, applications, orgs] = await Promise.all([
    getCurrentUser(),
    prisma.application.findMany({
      where: { applicantId: userId },
      include: { whitelist: { select: { name: true, code: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    listMyOrganizations(userId),
  ]);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 gap-8">
      <div className="w-full max-w-sm flex items-center justify-between text-sm text-neutral-400">
        <span>{user?.name}</span>
        <div className="flex items-center gap-3">
          {orgs.length > 0 && (
            <Link href="/panel" className="hover:text-neutral-200">
              Panel
            </Link>
          )}
          <form action={logout}>
            <button type="submit" className="hover:text-neutral-200">
              Salir
            </button>
          </form>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3 text-center">
        <h1 className="text-xl font-bold">Introduce tu código de whitelist</h1>
        <StartApplicationForm />
      </div>

      {applications.length > 0 && (
        <div className="w-full max-w-sm space-y-3">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Tus postulaciones</h2>
          <ul className="divide-y divide-neutral-800 border border-neutral-800 rounded-lg">
            {applications.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/apply/${app.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-900 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{app.whitelist.name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{app.whitelist.code}</p>
                  </div>
                  <span className="text-xs text-neutral-400">{STATUS_LABEL[app.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
