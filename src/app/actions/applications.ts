"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifySession, getOrgRole } from "@/lib/dal";
import { canReviewApplications } from "@/lib/permissions";
import { buildWhitelistAnswersSchema, type QuestionForSchema } from "@/lib/dynamic-schema";
import type { OptionDef, QuestionValidation } from "@/lib/dynamic-schema";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { notifyApplicationEvent } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";

const GENERIC_CODE_ERROR = "Código no válido o esta whitelist no está aceptando postulaciones.";
const MAX_ANSWER_JSON_LENGTH = 20_000;

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase();
}

export type StartApplicationState = { error: string } | undefined;

export async function startApplication(
  _prev: StartApplicationState,
  formData: FormData
): Promise<StartApplicationState> {
  const { userId } = await verifySession();
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (!code) return { error: GENERIC_CODE_ERROR };

  // Los códigos son un espacio de valores adivinable (a diferencia de un
  // token opaco), así que se limita el ritmo de intentos por usuario.
  if (!checkRateLimit(`start-application:${userId}`, 15, 10 * 60_000)) {
    return { error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." };
  }

  const whitelist = await prisma.whitelist.findUnique({ where: { code } });

  // Mensaje genérico siempre: no revelar si el código no existe, está mal
  // escrito, o pertenece a una whitelist DRAFT/CLOSED/ARCHIVED de otra org.
  if (!whitelist) return { error: GENERIC_CODE_ERROR };

  const existing = await prisma.application.findUnique({
    where: { whitelistId_applicantId: { whitelistId: whitelist.id, applicantId: userId } },
  });
  if (existing) redirect(`/apply/${existing.id}`);

  if (whitelist.status !== "OPEN") return { error: GENERIC_CODE_ERROR };

  const application = await prisma.application.create({
    data: { whitelistId: whitelist.id, applicantId: userId },
  });
  redirect(`/apply/${application.id}`);
}

export async function saveAnswer(applicationId: string, questionId: string, value: unknown) {
  const { userId } = await verifySession();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { applicantId: true, status: true },
  });
  if (!application || application.applicantId !== userId) return { error: "Postulación no encontrada." };
  if (application.status !== "IN_PROGRESS") {
    return { error: "Esta postulación ya fue enviada y no se puede editar." };
  }

  const serialized = JSON.stringify(value ?? null);
  if (serialized.length > MAX_ANSWER_JSON_LENGTH) return { error: "Respuesta demasiado larga." };

  await prisma.answer.upsert({
    where: { applicationId_questionId: { applicationId, questionId } },
    update: { value: value as never },
    create: { applicationId, questionId, value: value as never },
  });

  return { ok: true };
}

export async function submitApplication(applicationId: string) {
  const { userId } = await verifySession();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { whitelist: true },
  });
  if (!application || application.applicantId !== userId) return { error: "Postulación no encontrada." };
  if (application.status !== "IN_PROGRESS") return { error: "Esta postulación ya fue enviada." };
  if (application.whitelist.status !== "OPEN") {
    return { error: "Esta whitelist ya no está aceptando postulaciones." };
  }

  const [questions, answers] = await Promise.all([
    prisma.formQuestion.findMany({
      where: { section: { whitelistId: application.whitelistId, archived: false }, archived: false },
      orderBy: [{ section: { order: "asc" } }, { order: "asc" }],
    }),
    prisma.answer.findMany({ where: { applicationId } }),
  ]);

  const answerMap = Object.fromEntries(answers.map((a) => [a.questionId, a.value]));
  const schema = buildWhitelistAnswersSchema(
    questions.map(
      (q): QuestionForSchema => ({
        id: q.id,
        type: q.type,
        required: q.required,
        options: q.options as OptionDef[] | null,
        validation: q.validation as QuestionValidation,
      })
    )
  );

  const parsed = schema.safeParse(answerMap);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Revisa las preguntas marcadas antes de enviar.", fieldErrors };
  }

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    }),
    prisma.applicationEvent.create({
      data: {
        applicationId,
        actorId: userId,
        type: "STATUS_CHANGED",
        fromStatus: "IN_PROGRESS",
        toStatus: "SUBMITTED",
      },
    }),
  ]);

  revalidatePath(`/apply/${applicationId}`);
  return { ok: true };
}

// ---------- Revisión de staff ----------

async function requireCanReview(applicationId: string) {
  const { userId } = await verifySession();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { whitelist: { select: { id: true, organizationId: true } }, applicant: { select: { name: true } } },
  });
  if (!application) return { error: "Postulación no encontrada." } as const;

  const role = await getOrgRole(application.whitelist.organizationId, userId);
  if (!canReviewApplications(role)) return { error: "No tienes permiso para revisar postulaciones." } as const;

  return { ok: true, userId, application } as const;
}

async function transitionStatus(applicationId: string, toStatus: ApplicationStatus, note?: string) {
  const check = await requireCanReview(applicationId);
  if ("error" in check) return check;
  const { userId, application } = check;

  if (application.status === "IN_PROGRESS") {
    return { error: "Esta postulación todavía no ha sido enviada por el postulante." };
  }

  const fromStatus = application.status;

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: { status: toStatus, reviewedAt: new Date(), reviewedById: userId },
    });
    await tx.applicationEvent.create({
      data: { applicationId, actorId: userId, type: "STATUS_CHANGED", fromStatus, toStatus },
    });
    if (note?.trim()) {
      await tx.applicationNote.create({ data: { applicationId, authorId: userId, body: note.trim() } });
    }
  });

  await notifyApplicationEvent({
    applicationId,
    whitelistId: application.whitelist.id,
    organizationId: application.whitelist.organizationId,
    type: "STATUS_CHANGED",
    actorName: null,
    fromStatus,
    toStatus,
    note,
  });

  revalidatePath(`/panel`);
  return { ok: true };
}

export async function approveApplication(applicationId: string) {
  return transitionStatus(applicationId, "APPROVED");
}

export async function rejectApplication(applicationId: string, reason?: string) {
  return transitionStatus(applicationId, "REJECTED", reason);
}

export async function requestInterview(applicationId: string, note?: string) {
  return transitionStatus(applicationId, "INTERVIEW", note);
}

export async function addApplicationNote(applicationId: string, body: string) {
  const check = await requireCanReview(applicationId);
  if ("error" in check) return check;
  const { userId } = check;

  const trimmed = body.trim();
  if (!trimmed) return { error: "La nota no puede estar vacía." };

  await prisma.$transaction([
    prisma.applicationNote.create({ data: { applicationId, authorId: userId, body: trimmed } }),
    prisma.applicationEvent.create({
      data: { applicationId, actorId: userId, type: "NOTE_ADDED" },
    }),
  ]);

  revalidatePath(`/panel`);
  return { ok: true };
}
