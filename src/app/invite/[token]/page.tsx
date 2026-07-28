import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { AcceptInviteForm } from "./AcceptInviteForm";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  await verifySession();
  const { token } = await params;

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-neutral-400">Esta invitación no es válida o ya caducó.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-xl font-bold">
          Invitación a {invite.organization.name}
        </h1>
        <p className="text-sm text-neutral-400">
          Te han invitado como <span className="text-neutral-200">{invite.role}</span> con el correo{" "}
          {invite.email}.
        </p>
        <AcceptInviteForm token={token} />
      </div>
    </div>
  );
}
