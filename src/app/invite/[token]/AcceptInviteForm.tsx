"use client";

import { useActionState } from "react";
import { acceptOrgInvite } from "@/app/actions/invites";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptOrgInvite, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-violet-600 font-semibold rounded-lg px-4 py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Aceptando..." : "Aceptar invitación"}
      </button>
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
    </form>
  );
}
