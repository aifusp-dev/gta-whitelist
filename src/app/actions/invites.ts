"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession, getCurrentUser } from "@/lib/dal";

export type AcceptInviteState = { error: string } | undefined;

export async function acceptOrgInvite(
  _prev: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "");
  const { userId } = await verifySession();
  const user = await getCurrentUser();
  if (!user) return { error: "No se pudo verificar tu sesión." };

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { organization: { select: { slug: true } } },
  });

  if (!invite) return { error: "Invitación no encontrada." };
  if (invite.acceptedAt) return { error: "Esta invitación ya fue utilizada." };
  if (invite.expiresAt < new Date()) return { error: "Esta invitación ha caducado." };
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      error: `Esta invitación es para ${invite.email}. Inicia sesión con esa cuenta de Google para aceptarla.`,
    };
  }

  await prisma.$transaction([
    prisma.orgMember.upsert({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId } },
      update: { role: invite.role },
      create: { organizationId: invite.organizationId, userId, role: invite.role },
    }),
    prisma.orgInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);

  redirect(`/panel/${invite.organization.slug}`);
}
