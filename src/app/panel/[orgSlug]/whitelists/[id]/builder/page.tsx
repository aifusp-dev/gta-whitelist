import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession, getOrgBySlug, getOrgRole } from "@/lib/dal";
import { canManageOrg } from "@/lib/permissions";
import { BuilderBoard } from "./BuilderBoard";
import type { OptionDef } from "@/lib/dynamic-schema";

export default async function BuilderPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const { userId } = await verifySession();
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const role = await getOrgRole(org.id, userId);
  if (!canManageOrg(role)) notFound();

  const sections = await prisma.formSection.findMany({
    where: { whitelistId: id, archived: false },
    orderBy: { order: "asc" },
    include: {
      questions: {
        where: { archived: false },
        orderBy: { order: "asc" },
      },
    },
  });

  return (
    <BuilderBoard
      whitelistId={id}
      sections={sections.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        questions: s.questions.map((q) => ({
          id: q.id,
          type: q.type,
          label: q.label,
          helpText: q.helpText,
          required: q.required,
          options: (q.options as OptionDef[] | null) ?? null,
        })),
      }))}
    />
  );
}
