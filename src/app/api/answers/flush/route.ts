import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

type FlushPayload = {
  applicationId: string;
  answers: { questionId: string; value: unknown }[];
};

// Destino de navigator.sendBeacon() al cerrar la pestaña con cambios sin
// guardar todavía (el debounce normal de 700ms no llegó a dispararse).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let payload: FlushPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const application = await prisma.application.findUnique({
    where: { id: payload.applicationId },
    select: { applicantId: true, status: true },
  });
  if (!application || application.applicantId !== session.userId || application.status !== "IN_PROGRESS") {
    return NextResponse.json({ ok: true }); // fallo silencioso, no es crítico
  }

  await Promise.all(
    payload.answers.slice(0, 100).map((a) =>
      prisma.answer.upsert({
        where: { applicationId_questionId: { applicationId: payload.applicationId, questionId: a.questionId } },
        update: { value: a.value as never },
        create: { applicationId: payload.applicationId, questionId: a.questionId, value: a.value as never },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
