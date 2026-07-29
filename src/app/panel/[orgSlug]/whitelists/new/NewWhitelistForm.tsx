"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWhitelist } from "@/app/actions/whitelists";

const inputClass =
  "w-full bg-neutral-900/70 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30";

export function NewWhitelistForm({ organizationId, orgSlug }: { organizationId: string; orgSlug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createWhitelist(organizationId, orgSlug, { name, code, description });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("id" in res && res.id) {
        router.push(`/panel/${orgSlug}/whitelists/${res.id}/builder`);
      }
    });
  }

  return (
    <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 space-y-5">
      <label className="space-y-1.5 block">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Whitelist Civil 2026"
          className={inputClass}
        />
      </label>

      <label className="space-y-1.5 block">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Código único</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="LOOMI-2026"
          className={`${inputClass} font-mono tracking-wide`}
        />
        <span className="text-xs text-neutral-500">
          Es lo que escribirán los postulantes para empezar. No podrás cambiarlo después.
        </span>
      </label>

      <label className="space-y-1.5 block">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Descripción (opcional)
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={pending || !name || !code}
        className="w-full bg-violet-600 font-heading font-semibold rounded-xl px-4 py-3 text-sm hover:bg-violet-500 transition-colors disabled:opacity-50"
      >
        {pending ? "Creando..." : "Crear whitelist"}
      </button>
    </div>
  );
}
