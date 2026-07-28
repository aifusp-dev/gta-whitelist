"use client";

import { useState, useTransition } from "react";
import { inviteMember, setMemberRole, removeMember } from "@/app/actions/members";
import type { OrgRole } from "@/generated/prisma/enums";

type Member = { id: string; role: OrgRole; user: { id: string; name: string; email: string; image: string | null } };
type Invite = { id: string; email: string; role: OrgRole; token: string; expiresAt: string };

export function MembersClient({
  organizationId,
  members,
  invites,
  currentUserId,
}: {
  organizationId: string;
  members: Member[];
  invites: Invite[];
  currentUserId: string;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("STAFF");
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitInvite() {
    setError(null);
    setInviteLink(null);
    startTransition(async () => {
      const res = await inviteMember(organizationId, email, role);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("token" in res && res.token) {
        setEmail("");
        setInviteLink(`${window.location.origin}/invite/${res.token}`);
      }
    });
  }

  function changeRole(memberId: string, newRole: OrgRole) {
    startTransition(async () => {
      await setMemberRole(organizationId, memberId, newRole);
    });
  }

  function remove(memberId: string) {
    if (!confirm("¿Eliminar a este miembro de la organización?")) return;
    startTransition(async () => {
      await removeMember(organizationId, memberId);
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">Miembros</h2>
        <ul className="divide-y divide-neutral-800 border border-neutral-800 rounded-lg">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{m.user.name}</p>
                <p className="text-xs text-neutral-500">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value as OrgRole)}
                  disabled={pending || m.user.id === currentUserId}
                  className="bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1 text-xs"
                >
                  <option value="OWNER">OWNER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="STAFF">STAFF</option>
                </select>
                <button
                  onClick={() => remove(m.id)}
                  disabled={pending || m.user.id === currentUserId}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-30"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {invites.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
            Invitaciones pendientes
          </h2>
          <ul className="divide-y divide-neutral-800 border border-neutral-800 rounded-lg">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{inv.email}</span>
                <span className="text-xs text-neutral-500 uppercase">{inv.role}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">Invitar a alguien</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@gmail.com"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2 text-sm"
          >
            <option value="STAFF">STAFF</option>
            <option value="ADMIN">ADMIN</option>
            <option value="OWNER">OWNER</option>
          </select>
          <button
            onClick={submitInvite}
            disabled={pending || !email}
            className="bg-violet-600 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
          >
            Invitar
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {inviteLink && (
          <div className="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
            Comparte este enlace (aún no enviamos emails):
            <br />
            <span className="text-neutral-200 break-all">{inviteLink}</span>
          </div>
        )}
      </section>
    </div>
  );
}
