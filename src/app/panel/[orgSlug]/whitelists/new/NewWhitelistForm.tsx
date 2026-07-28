"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWhitelist } from "@/app/actions/whitelists";

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
    <div className="space-y-4">
      <label className="space-y-1.5 block">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Whitelist Civil 2026"
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
        />
      </label>

      <label className="space-y-1.5 block">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Código único</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="LOOMI-2026"
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:border-neutral-500"
        />
        <span className="text-xs text-neutral-500">
          Es lo que escribirán los postulantes para empezar. No podrás cambiarlo después.
        </span>
      </label>

      <label className="space-y-1.5 block">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Descripción (opcional)
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
        />
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={pending || !name || !code}
        className="w-full bg-violet-600 font-semibold rounded-lg px-4 py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Creando..." : "Crear whitelist"}
      </button>
    </div>
  );
}
