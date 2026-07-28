import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { ApplicationForm } from "./ApplicationForm";
import type { OptionDef } from "@/lib/dynamic-schema";

export default async function ApplicationPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const { userId } = await verifySession();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { whitelist: true, answers: true },
  });

  if (!application || application.applicantId !== userId) notFound();

  const sections = await prisma.formSection.findMany({
    where: { whitelistId: application.whitelistId, archived: false },
    orderBy: { order: "asc" },
    include: { questions: { where: { archived: false }, orderBy: { order: "asc" } } },
  });

  const initialAnswers = Object.fromEntries(application.answers.map((a) => [a.questionId, a.value]));

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <Link href="/apply" className="text-xs text-neutral-500 hover:text-neutral-300">
            ← Mis postulaciones
          </Link>
          <h1 className="text-xl font-bold mt-1">{application.whitelist.name}</h1>
          <p className="text-xs text-neutral-500 font-mono">{application.whitelist.code}</p>
        </div>

        <ApplicationForm
          applicationId={application.id}
          status={application.status}
          initialAnswers={initialAnswers}
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
      </div>
    </div>
  );
}
