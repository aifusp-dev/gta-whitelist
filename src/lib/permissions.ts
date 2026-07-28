import type { OrgRole } from "@/generated/prisma/enums";

/** OWNER/ADMIN gestionan la organización: whitelists, builder, miembros. */
export function canManageOrg(role: OrgRole | null) {
  return role === "OWNER" || role === "ADMIN";
}

/** Cualquier miembro (OWNER/ADMIN/STAFF) puede revisar postulaciones — permiso plano en v1. */
export function canReviewApplications(role: OrgRole | null) {
  return role === "OWNER" || role === "ADMIN" || role === "STAFF";
}

/** Solo OWNER puede eliminar la organización o transferir la propiedad. */
export function canDeleteOrg(role: OrgRole | null) {
  return role === "OWNER";
}
