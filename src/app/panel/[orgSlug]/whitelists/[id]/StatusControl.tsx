"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWhitelistStatus } from "@/app/actions/whitelists";
import type { WhitelistStatus } from "@/generated/prisma/enums";

const OPTIONS: { value: WhitelistStatus; label: string }[] = [
  { value: "DRAFT", label: "Borrador (nadie puede postular)" },
  { value: "OPEN", label: "Abierta (acepta postulaciones)" },
  { value: "CLOSED", label: "Cerrada (no acepta nuevas)" },
  { value: "ARCHIVED", label: "Archivada" },
];

const DOT_COLOR: Record<WhitelistStatus, string> = {
  DRAFT: "bg-neutral-500",
  OPEN: "bg-green-500",
  CLOSED: "bg-amber-500",
  ARCHIVED: "bg-neutral-700",
};

export function StatusControl({ whitelistId, status }: { whitelistId: string; status: WhitelistStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: WhitelistStatus) {
    startTransition(async () => {
      await updateWhitelistStatus(whitelistId, next);
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${DOT_COLOR[status]}`} />
      <select
        value={status}
        disabled={pending}
        onChange={(e) => change(e.target.value as WhitelistStatus)}
        className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
