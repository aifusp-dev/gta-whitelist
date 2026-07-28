import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession, getOrgBySlug, getOrgRole } from "@/lib/dal";
import { canReviewApplications } from "@/lib/permissions";
import { QuickActions } from "./QuickActions";
import { NotesPanel } from "./NotesPanel";
import { Timeline } from "./Timeline";
import type { OptionDef } from "@/lib/dynamic-schema";

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "En progreso",
  SUBMITTED: "Enviada",
  IN_REVIEW: "En revisión",
  INTERVIEW: "Entrevista",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

function renderAnswer(type: string, value: unknown, options: OptionDef[] | null): string {
  if (value === null || value === undefined || value === "") return "—";

  if (type === "SINGLE_SELECT") {
    const opt = options?.find((o) => o.id === value);
    return opt?.label ?? "(opción eliminada)";
  }
  if (type === "MULTI_SELECT" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map((id) => options?.find((o) => o.id === id)?.label ?? "(opción eliminada)").join(", ");
  }
  if (type === "CHECKBOX") return value ? "Sí" : "No";
  if (type === "DATE" && typeof value === "string") {
    return new Date(value).toLocaleDateString("es-ES");
  }
  return String(value);
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string; appId: string }>;
}) {
  const { orgSlug, id, appId } = await params;
  const { userId } = await verifySession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const role = await getOrgRole(org.id, userId);
  if (!canReviewApplications(role)) notFound();

  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: { applicant: true },
  });
  if (!application || application.whitelistId !== id) notFound();

  const [answers, notes, events] = await Promise.all([
    prisma.answer.findMany({
      where: { applicationId: appId },
      include: { question: { include: { section: true } } },
    }),
    prisma.applicationNote.findMany({
      where: { applicationId: appId },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.applicationEvent.findMany({
      where: { applicationId: appId },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sorted = [...answers].sort((a, b) => {
    const sectionOrder = a.question.section.order - b.question.section.order;
    if (sectionOrder !== 0) return sectionOrder;
    return a.question.order - b.question.order;
  });

  const sections = new Map<string, { title: string; rows: typeof sorted }>();
  for (const answer of sorted) {
    const key = answer.question.sectionId;
    if (!sections.has(key)) sections.set(key, { title: answer.question.section.title, rows: [] });
    sections.get(key)!.rows.push(answer);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="flex items-center gap-3">
          {application.applicant.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={application.applicant.image} alt="" className="w-10 h-10 rounded-full" />
          )}
          <div>
            <h1 className="font-bold">{application.applicant.name}</h1>
            <p className="text-xs text-neutral-500">{application.applicant.email}</p>
          </div>
          <span className="ml-auto text-xs font-medium uppercase text-neutral-400">
            {STATUS_LABEL[application.status]}
          </span>
        </div>

        {[...sections.entries()].map(([sectionId, { title, rows }]) => (
          <div key={sectionId} className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">{title}</h2>
            <div className="space-y-3">
              {rows.map((answer) => (
                <div key={answer.id} className="border-b border-neutral-900 pb-2">
                  <p className="text-sm text-neutral-400">
                    {answer.question.label}
                    {answer.question.archived && (
                      <span className="ml-2 text-xs text-neutral-600">(pregunta eliminada)</span>
                    )}
                  </p>
                  <p className="text-sm">
                    {renderAnswer(answer.question.type, answer.value, answer.question.options as OptionDef[] | null)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {sections.size === 0 && <p className="text-sm text-neutral-500">Sin respuestas todavía.</p>}
      </div>

      <div className="space-y-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Acciones</h3>
          <QuickActions applicationId={appId} status={application.status} />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <NotesPanel
            applicationId={appId}
            notes={notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
          />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Historial</h3>
          <Timeline events={events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))} />
        </div>
      </div>
    </div>
  );
}
