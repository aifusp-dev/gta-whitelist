"use client";

import { useState, useTransition } from "react";
import { renameOrganization } from "@/app/actions/organizations";

export function SettingsForm({ organizationId, initialName }: { organizationId: string; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await renameOrganization(organizationId, name);
      setMessage("error" in res && res.error ? res.error : "Guardado.");
    });
  }

  return (
    <div className="space-y-3 max-w-sm">
      <label className="space-y-1.5 block">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Nombre de la organización
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
        />
      </label>
      <button
        onClick={save}
        disabled={pending || name.trim() === initialName}
        className="bg-violet-600 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
      {message && <p className="text-xs text-neutral-400">{message}</p>}
    </div>
  );
}
