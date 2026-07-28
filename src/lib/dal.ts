import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return { userId: session.userId };
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, image: true, createdAt: true },
  });
});

export function isAdminEmail(email: string) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.toLowerCase());
}

/**
 * Super-admin de plataforma (vía ADMIN_EMAILS): no implica pertenencia a
 * ninguna organización, solo desbloquea el acceso de soporte de getOrgRole.
 */
export const requireAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/apply");

  return user;
});

/**
 * Rol del usuario en una organización, o null si no tiene acceso. Los
 * super-admins de plataforma (ADMIN_EMAILS) obtienen "ADMIN" aunque no sean
 * miembros reales — modo soporte, igual que en customcalcs.
 */
export const getOrgRole = cache(async (organizationId: string, userId: string) => {
  const member = await prisma.orgMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true },
  });

  if (member) return member.role;

  const user = await getCurrentUser();
  if (user && isAdminEmail(user.email)) return "ADMIN" as const;

  return null;
});

/**
 * True si el acceso del usuario a esta organización viene del modo
 * super-admin de plataforma (no es miembro real) — para mostrar el aviso de
 * que está gestionando la organización de otra persona.
 */
export const getOrgBySlug = cache(async (slug: string) => {
  return prisma.organization.findUnique({ where: { slug } });
});

export const listMyOrganizations = cache(async (userId: string) => {
  const [memberships, user] = await Promise.all([
    prisma.orgMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { organization: { name: "asc" } },
    }),
    getCurrentUser(),
  ]);

  const orgs = memberships.map((m) => ({ ...m.organization, myRole: m.role }));

  if (user && isAdminEmail(user.email)) {
    const memberOrgIds = new Set(orgs.map((o) => o.id));
    const allOrgs = await prisma.organization.findMany({ orderBy: { name: "asc" } });
    for (const org of allOrgs) {
      if (!memberOrgIds.has(org.id)) orgs.push({ ...org, myRole: "ADMIN" as const });
    }
  }

  return orgs;
});

/** organizationId dueño de un whitelist, o null si no existe — para checks de tenant/permiso en acciones. */
export const getWhitelistOrgId = cache(async (whitelistId: string) => {
  const whitelist = await prisma.whitelist.findUnique({
    where: { id: whitelistId },
    select: { organizationId: true },
  });
  return whitelist?.organizationId ?? null;
});

export const isOrgAccessOverride = cache(async (organizationId: string, userId: string) => {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) return false;

  const member = await prisma.orgMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { id: true },
  });

  return !member;
});
