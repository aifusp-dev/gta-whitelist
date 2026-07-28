"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createOrganization, type OrgFormState } from "@/app/actions/organizations";

export default function NewOrganizationPage() {
  const [state, action, pending] = useActionState<OrgFormState, FormData>(createOrganization, undefined);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold">Crea tu organización</h1>
          <p className="text-sm text-neutral-400">
            Es el espacio desde el que gestionarás tus whitelists (por ejemplo, tu servidor de GTA RP).
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
              Nombre
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="LOOMI"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-neutral-500 transition-colors"
            />
            {state?.errors?.name && <p className="text-xs text-red-400">{state.errors.name[0]}</p>}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-violet-600 font-semibold rounded-lg px-4 py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pending ? "Creando..." : "Crear organización"}
          </button>
        </form>

        <p className="text-center text-sm">
          <Link href="/apply" className="text-neutral-500 hover:text-neutral-300 underline">
            Volver
          </Link>
        </p>
      </div>
    </div>
  );
}
