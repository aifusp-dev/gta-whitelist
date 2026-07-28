"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession, getOrgRole } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";
import { slugify } from "@/lib/slug";

export type OrgFormState = { message?: string; errors?: Record<string, string[]> } | undefined;

async function uniqueSlugFor(name: string) {
  const base = slugify(name) || "org";
  let slug = base;
  let attempt = 1;
  while (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

export async function createOrganization(_prev: OrgFormState, formData: FormData): Promise<OrgFormState> {
  const { userId } = await verifySession();
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2) {
    return { errors: { name: ["El nombre debe tener al menos 2 caracteres."] } };
  }

  const slug = await uniqueSlugFor(name);

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      members: { create: { userId, role: "OWNER" } },
    },
  });

  redirect(`/panel/${org.slug}`);
}

export async function renameOrganization(organizationId: string, name: string) {
  const { userId } = await verifySession();
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "El nombre debe tener al menos 2 caracteres." };

  const role = await getOrgRole(organizationId, userId);
  if (!canManageOrg(role)) return { error: "No tienes permiso para editar esta organización." };

  await prisma.organization.update({ where: { id: organizationId }, data: { name: trimmed } });
  return { ok: true };
}
