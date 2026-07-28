"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveApplication, rejectApplication, requestInterview } from "@/app/actions/applications";
import type { ApplicationStatus } from "@/generated/prisma/enums";

type PendingAction = "reject" | "interview" | null;

export function QuickActions({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const disabled = status === "IN_PROGRESS";

  function run(action: () => Promise<{ error?: string } | { ok: true }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      setPendingAction(null);
      setNote("");
      router.refresh();
    });
  }

  if (disabled) {
    return <p className="text-xs text-neutral-600">El postulante todavía no ha enviado esta postulación.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => run(() => approveApplication(applicationId))}
          disabled={busy}
          className="bg-green-700 hover:bg-green-600 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Aprobar
        </button>
        <button
          type="button"
          onClick={() => setPendingAction(pendingAction === "interview" ? null : "interview")}
          disabled={busy}
          className="bg-violet-700 hover:bg-violet-600 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Entrevista
        </button>
        <button
          type="button"
          onClick={() => setPendingAction(pendingAction === "reject" ? null : "reject")}
          disabled={busy}
          className="bg-red-800 hover:bg-red-700 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>

      {pendingAction && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={pendingAction === "reject" ? "Motivo (opcional)..." : "Detalles de la entrevista (opcional)..."}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button
            type="button"
            onClick={() =>
              run(() =>
                pendingAction === "reject"
                  ? rejectApplication(applicationId, note)
                  : requestInterview(applicationId, note)
              )
            }
            disabled={busy}
            className="text-xs bg-neutral-800 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
          >
            Confirmar {pendingAction === "reject" ? "rechazo" : "entrevista"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
