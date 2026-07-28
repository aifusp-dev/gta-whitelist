import type { ApplicationEventType, ApplicationStatus } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  IN_PROGRESS: "En progreso",
  SUBMITTED: "Enviada",
  IN_REVIEW: "En revisión",
  INTERVIEW: "Entrevista",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

export type TimelineEvent = {
  id: string;
  type: ApplicationEventType;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  createdAt: string;
  actor: { name: string } | null;
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-neutral-600">Sin actividad todavía.</p>;
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="text-xs text-neutral-400 flex gap-2">
          <span className="text-neutral-600 shrink-0">
            {new Date(e.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
          </span>
          <span>
            <span className="text-neutral-300">{e.actor?.name ?? "Sistema"}</span>{" "}
            {e.type === "NOTE_ADDED" ? (
              "añadió una nota"
            ) : (
              <>
                cambió el estado: {e.fromStatus ? STATUS_LABEL[e.fromStatus] : "—"} →{" "}
                <span className="text-neutral-200">{e.toStatus ? STATUS_LABEL[e.toStatus] : "—"}</span>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
