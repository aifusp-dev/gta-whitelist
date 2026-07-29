"use client";

import { useActionState } from "react";
import { startApplication } from "@/app/actions/applications";

export function StartApplicationForm() {
  const [state, action, pending] = useActionState(startApplication, undefined);

  return (
    <form action={action} className="space-y-3">
      <input
        name="code"
        placeholder="LOOMI-2026"
        required
        className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl px-4 py-4 text-center text-xl font-heading font-semibold tracking-[0.15em] uppercase outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
        style={{ textTransform: "uppercase" }}
      />
      {state?.error && <p className="text-xs text-red-400 text-center">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-violet-600 hover:bg-violet-500 font-heading font-semibold rounded-xl px-4 py-3 text-sm transition-colors disabled:opacity-50"
      >
        {pending ? "Comprobando..." : "Empezar"}
      </button>
    </form>
  );
}
