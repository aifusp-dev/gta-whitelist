"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifySession, getOrgRole, getWhitelistOrgId } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";
import type { QuestionType } from "@/generated/prisma/enums";
import type { OptionDef, QuestionValidation } from "@/lib/dynamic-schema";

async function requireManageBySection(sectionId: string) {
  const { userId } = await verifySession();
  const section = await prisma.formSection.findUnique({
    where: { id: sectionId },
    select: { whitelistId: true },
  });
  if (!section) return { error: "Sección no encontrada." } as const;

  const organizationId = await getWhitelistOrgId(section.whitelistId);
  if (!organizationId) return { error: "Whitelist no encontrada." } as const;

  const role = await getOrgRole(organizationId, userId);
  if (!canManageOrg(role)) return { error: "No tienes permiso para editar este formulario." } as const;

  return { ok: true, whitelistId: section.whitelistId } as const;
}

async function requireManageByWhitelist(whitelistId: string) {
  const { userId } = await verifySession();
  const organizationId = await getWhitelistOrgId(whitelistId);
  if (!organizationId) return { error: "Whitelist no encontrada." } as const;

  const role = await getOrgRole(organizationId, userId);
  if (!canManageOrg(role)) return { error: "No tienes permiso para editar este formulario." } as const;

  return { ok: true } as const;
}

// ---------- Secciones ----------

export async function createSection(whitelistId: string, title: string) {
  const check = await requireManageByWhitelist(whitelistId);
  if ("error" in check) return check;

  const trimmed = title.trim();
  if (trimmed.length < 2) return { error: "El título debe tener al menos 2 caracteres." };

  const last = await prisma.formSection.findFirst({
    where: { whitelistId, archived: false },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const section = await prisma.formSection.create({
    data: { whitelistId, title: trimmed, order: (last?.order ?? -1) + 1 },
  });

  revalidatePath(`/panel`);
  return { ok: true, id: section.id };
}

export async function updateSection(sectionId: string, data: { title: string; description?: string }) {
  const check = await requireManageBySection(sectionId);
  if ("error" in check) return check;

  const title = data.title.trim();
  if (title.length < 2) return { error: "El título debe tener al menos 2 caracteres." };

  await prisma.formSection.update({
    where: { id: sectionId },
    data: { title, description: data.description?.trim() || null },
  });
  revalidatePath(`/panel`);
  return { ok: true };
}

export async function archiveSection(sectionId: string) {
  const check = await requireManageBySection(sectionId);
  if ("error" in check) return check;

  await prisma.formSection.update({ where: { id: sectionId }, data: { archived: true } });
  revalidatePath(`/panel`);
  return { ok: true };
}

export async function reorderSections(whitelistId: string, orderedSectionIds: string[]) {
  const check = await requireManageByWhitelist(whitelistId);
  if ("error" in check) return check;

  await prisma.$transaction(
    orderedSectionIds.map((id, index) =>
      prisma.formSection.update({ where: { id, whitelistId }, data: { order: index } })
    )
  );
  revalidatePath(`/panel`);
  return { ok: true };
}

// ---------- Preguntas ----------

export type QuestionInput = {
  type: QuestionType;
  label: string;
  helpText?: string;
  required: boolean;
  options?: OptionDef[];
  validation?: QuestionValidation;
};

export async function createQuestion(sectionId: string, data: QuestionInput) {
  const check = await requireManageBySection(sectionId);
  if ("error" in check) return check;

  const label = data.label.trim();
  if (label.length < 2) return { error: "La pregunta debe tener al menos 2 caracteres." };

  const last = await prisma.formQuestion.findFirst({
    where: { sectionId, archived: false },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const question = await prisma.formQuestion.create({
    data: {
      sectionId,
      type: data.type,
      label,
      helpText: data.helpText?.trim() || null,
      required: data.required,
      options: data.options ?? undefined,
      validation: data.validation ?? undefined,
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidatePath(`/panel`);
  return { ok: true, id: question.id };
}

export async function updateQuestion(questionId: string, data: QuestionInput) {
  const question = await prisma.formQuestion.findUnique({ where: { id: questionId }, select: { sectionId: true } });
  if (!question) return { error: "Pregunta no encontrada." };

  const check = await requireManageBySection(question.sectionId);
  if ("error" in check) return check;

  const label = data.label.trim();
  if (label.length < 2) return { error: "La pregunta debe tener al menos 2 caracteres." };

  await prisma.formQuestion.update({
    where: { id: questionId },
    data: {
      type: data.type,
      label,
      helpText: data.helpText?.trim() || null,
      required: data.required,
      options: data.options ?? undefined,
      validation: data.validation ?? undefined,
    },
  });
  revalidatePath(`/panel`);
  return { ok: true };
}

export async function archiveQuestion(questionId: string) {
  const question = await prisma.formQuestion.findUnique({ where: { id: questionId }, select: { sectionId: true } });
  if (!question) return { error: "Pregunta no encontrada." };

  const check = await requireManageBySection(question.sectionId);
  if ("error" in check) return check;

  await prisma.formQuestion.update({ where: { id: questionId }, data: { archived: true } });
  revalidatePath(`/panel`);
  return { ok: true };
}

export async function reorderQuestions(sectionId: string, orderedQuestionIds: string[]) {
  const check = await requireManageBySection(sectionId);
  if ("error" in check) return check;

  await prisma.$transaction(
    orderedQuestionIds.map((id, index) =>
      prisma.formQuestion.update({ where: { id, sectionId }, data: { order: index } })
    )
  );
  revalidatePath(`/panel`);
  return { ok: true };
}

export async function moveQuestionToSection(questionId: string, targetSectionId: string, targetIndex: number) {
  const checkTarget = await requireManageBySection(targetSectionId);
  if ("error" in checkTarget) return checkTarget;

  const question = await prisma.formQuestion.findUnique({ where: { id: questionId }, select: { sectionId: true } });
  if (!question) return { error: "Pregunta no encontrada." };

  const checkSource = await requireManageBySection(question.sectionId);
  if ("error" in checkSource) return checkSource;

  const sourceSectionId = question.sectionId;

  await prisma.$transaction(async (tx) => {
    await tx.formQuestion.update({ where: { id: questionId }, data: { sectionId: targetSectionId } });

    const destQuestions = await tx.formQuestion.findMany({
      where: { sectionId: targetSectionId, archived: false },
      orderBy: { order: "asc" },
    });
    const moved = destQuestions.find((q) => q.id === questionId)!;
    const rest = destQuestions.filter((q) => q.id !== questionId);
    const clampedIndex = Math.max(0, Math.min(targetIndex, rest.length));
    rest.splice(clampedIndex, 0, moved);

    for (let i = 0; i < rest.length; i++) {
      await tx.formQuestion.update({ where: { id: rest[i].id }, data: { order: i } });
    }

    if (sourceSectionId !== targetSectionId) {
      const sourceQuestions = await tx.formQuestion.findMany({
        where: { sectionId: sourceSectionId, archived: false },
        orderBy: { order: "asc" },
      });
      for (let i = 0; i < sourceQuestions.length; i++) {
        await tx.formQuestion.update({ where: { id: sourceQuestions[i].id }, data: { order: i } });
      }
    }
  });

  revalidatePath(`/panel`);
  return { ok: true };
}
