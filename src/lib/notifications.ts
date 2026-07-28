import type { ApplicationEventType, ApplicationStatus } from "@/generated/prisma/enums";

export type ApplicationNotification = {
  applicationId: string;
  whitelistId: string;
  organizationId: string;
  type: ApplicationEventType;
  actorName: string | null;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  note?: string;
};

/**
 * Seam para integraciones futuras (Discord, etc.): no-op en v1. Cuando se
 * implemente el envío real (p.ej. a un webhook de Discord por organización),
 * este es el único sitio a tocar — ningún call site necesita cambiar.
 */
export async function notifyApplicationEvent(_event: ApplicationNotification) {
  return;
}
