"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifySession, getOrgRole } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";
import type { OrgRole } from "@/generated/prisma/enums";

const INVITE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function inviteMember(organizationId: string, email: string, role: OrgRole) {
  const { userId } = await verifySession();
  const callerRole = await getOrgRole(organizationId, userId);
  if (!canManageOrg(callerRole)) return { error: "No tienes permiso para invitar miembros." };

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) return { error: "Email no válido." };

  const existingMember = await prisma.orgMember.findFirst({
    where: { organizationId, user: { email: normalizedEmail } },
    select: { id: true },
  });
  if (existingMember) return { error: "Esa persona ya es miembro de la organización." };

  const token = randomBytes(24).toString("hex");
  const invite = await prisma.orgInvite.upsert({
    where: { organizationId_email: { organizationId, email: normalizedEmail } },
    update: { role, token, expiresAt: new Date(Date.now() + INVITE_DURATION_MS), acceptedAt: null },
    create: {
      organizationId,
      email: normalizedEmail,
      role,
      token,
      expiresAt: new Date(Date.now() + INVITE_DURATION_MS),
    },
  });

  revalidatePath(`/panel`);
  return { ok: true, token: invite.token };
}

export async function setMemberRole(organizationId: string, memberId: string, role: OrgRole) {
  const { userId } = await verifySession();
  const callerRole = await getOrgRole(organizationId, userId);
  if (!canManageOrg(callerRole)) return { error: "No tienes permiso para cambiar roles." };

  const member = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!member || member.organizationId !== organizationId) return { error: "Miembro no encontrado." };

  if (member.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await prisma.orgMember.count({ where: { organizationId, role: "OWNER" } });
    if (ownerCount <= 1) return { error: "Debe quedar al menos un OWNER en la organización." };
  }

  await prisma.orgMember.update({ where: { id: memberId }, data: { role } });
  revalidatePath(`/panel`);
  return { ok: true };
}

export async function removeMember(organizationId: string, memberId: string) {
  const { userId } = await verifySession();
  const callerRole = await getOrgRole(organizationId, userId);
  if (!canManageOrg(callerRole)) return { error: "No tienes permiso para eliminar miembros." };

  const member = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!member || member.organizationId !== organizationId) return { error: "Miembro no encontrado." };

  if (member.role === "OWNER") {
    const ownerCount = await prisma.orgMember.count({ where: { organizationId, role: "OWNER" } });
    if (ownerCount <= 1) return { error: "Debe quedar al menos un OWNER en la organización." };
  }

  await prisma.orgMember.delete({ where: { id: memberId } });
  revalidatePath(`/panel`);
  return { ok: true };
}
