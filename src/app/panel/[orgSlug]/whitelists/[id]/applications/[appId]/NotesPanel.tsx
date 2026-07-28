"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addApplicationNote } from "@/app/actions/applications";

export type NoteData = { id: string; body: string; createdAt: string; author: { name: string } };

export function NotesPanel({ applicationId, notes }: { applicationId: string; notes: NoteData[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addApplicationNote(applicationId, body);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Notas internas</h3>

      {notes.length === 0 ? (
        <p className="text-xs text-neutral-600">Sin notas todavía.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm">
              <p>{n.body}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {n.author.name} ·{" "}
                {new Date(n.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Añade una nota visible solo para el staff..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="text-xs bg-neutral-800 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
        >
          Añadir nota
        </button>
      </div>
    </div>
  );
}
