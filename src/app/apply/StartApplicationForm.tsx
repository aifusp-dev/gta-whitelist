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
        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-center text-lg font-mono tracking-wide uppercase outline-none focus:border-neutral-500"
        style={{ textTransform: "uppercase" }}
      />
      {state?.error && <p className="text-xs text-red-400 text-center">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-violet-600 font-semibold rounded-lg px-4 py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Comprobando..." : "Empezar"}
      </button>
    </form>
  );
}
