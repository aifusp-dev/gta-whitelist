import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession, getOrgBySlug, getOrgRole } from "@/lib/dal";
import { canReviewApplications } from "@/lib/permissions";
import type { ApplicationStatus } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  IN_PROGRESS: "En progreso",
  SUBMITTED: "Enviada",
  IN_REVIEW: "En revisión",
  INTERVIEW: "Entrevista",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  IN_PROGRESS: "text-neutral-500",
  SUBMITTED: "text-blue-400",
  IN_REVIEW: "text-amber-400",
  INTERVIEW: "text-violet-400",
  APPROVED: "text-green-400",
  REJECTED: "text-red-400",
};

const TABS: { value: ApplicationStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "SUBMITTED", label: "Enviadas" },
  { value: "IN_REVIEW", label: "En revisión" },
  { value: "INTERVIEW", label: "Entrevista" },
  { value: "APPROVED", label: "Aprobadas" },
  { value: "REJECTED", label: "Rechazadas" },
];

export default async function ApplicationsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { orgSlug, id } = await params;
  const { status } = await searchParams;
  const { userId } = await verifySession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const role = await getOrgRole(org.id, userId);
  if (!canReviewApplications(role)) notFound();

  const statusFilter = TABS.some((t) => t.value === status) && status !== "ALL" ? (status as ApplicationStatus) : null;

  const applications = await prisma.application.findMany({
    where: {
      whitelistId: id,
      status: statusFilter ? statusFilter : { not: "IN_PROGRESS" },
    },
    include: { applicant: { select: { name: true, email: true, image: true } } },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 text-xs border-b border-neutral-800 pb-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/panel/${orgSlug}/whitelists/${id}/applications${tab.value === "ALL" ? "" : `?status=${tab.value}`}`}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              (status ?? "ALL") === tab.value ? "bg-violet-600 text-white" : "text-neutral-400 hover:bg-neutral-900"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {applications.length === 0 ? (
        <p className="text-sm text-neutral-500">No hay postulaciones en este filtro.</p>
      ) : (
        <ul className="divide-y divide-neutral-800 border border-neutral-800 rounded-lg">
          {applications.map((app) => (
            <li key={app.id}>
              <Link
                href={`/panel/${orgSlug}/whitelists/${id}/applications/${app.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-900 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{app.applicant.name}</p>
                  <p className="text-xs text-neutral-500">{app.applicant.email}</p>
                </div>
                <span className={`text-xs font-medium uppercase ${STATUS_COLOR[app.status]}`}>
                  {STATUS_LABEL[app.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
