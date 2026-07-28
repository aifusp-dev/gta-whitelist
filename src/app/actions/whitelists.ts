"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { WhitelistStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { verifySession, getOrgRole, getWhitelistOrgId } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase();
}

export async function createWhitelist(
  organizationId: string,
  orgSlug: string,
  data: { name: string; description: string; code: string }
) {
  const { userId } = await verifySession();
  const role = await getOrgRole(organizationId, userId);
  if (!canManageOrg(role)) return { error: "No tienes permiso para crear whitelists." };

  const name = data.name.trim();
  const code = normalizeCode(data.code);
  if (name.length < 2) return { error: "El nombre debe tener al menos 2 caracteres." };
  if (code.length < 3) return { error: "El código debe tener al menos 3 caracteres." };

  try {
    const whitelist = await prisma.whitelist.create({
      data: { organizationId, name, description: data.description.trim() || null, code },
    });
    revalidatePath(`/panel/${orgSlug}/whitelists`);
    return { ok: true, id: whitelist.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ese código ya está en uso por otra whitelist. Prueba con otro." };
    }
    throw e;
  }
}

export async function updateWhitelist(
  whitelistId: string,
  data: { name: string; description: string }
) {
  const { userId } = await verifySession();
  const organizationId = await getWhitelistOrgId(whitelistId);
  if (!organizationId) return { error: "Whitelist no encontrada." };
  const role = await getOrgRole(organizationId, userId);
  if (!canManageOrg(role)) return { error: "No tienes permiso para editar esta whitelist." };

  const name = data.name.trim();
  if (name.length < 2) return { error: "El nombre debe tener al menos 2 caracteres." };

  await prisma.whitelist.update({
    where: { id: whitelistId },
    data: { name, description: data.description.trim() || null },
  });
  return { ok: true };
}

export async function updateWhitelistStatus(whitelistId: string, status: WhitelistStatus) {
  const { userId } = await verifySession();
  const organizationId = await getWhitelistOrgId(whitelistId);
  if (!organizationId) return { error: "Whitelist no encontrada." };
  const role = await getOrgRole(organizationId, userId);
  if (!canManageOrg(role)) return { error: "No tienes permiso para cambiar el estado de esta whitelist." };

  await prisma.whitelist.update({ where: { id: whitelistId }, data: { status } });
  return { ok: true };
}
