import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession, listMyOrganizations } from "@/lib/dal";

export default async function PanelPickerPage() {
  const { userId } = await verifySession();
  const orgs = await listMyOrganizations(userId);

  if (orgs.length === 0) {
    redirect("/panel/new");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold">Tus organizaciones</h1>
          <p className="text-sm text-neutral-400">Elige una para gestionar sus whitelists.</p>
        </div>

        <ul className="space-y-2">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={`/panel/${org.slug}`}
                className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 hover:border-neutral-600 transition-colors"
              >
                <span className="font-medium">{org.name}</span>
                <span className="text-xs text-neutral-500 uppercase tracking-wide">{org.myRole}</span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/panel/new"
          className="block text-center text-sm text-neutral-400 hover:text-neutral-200 underline"
        >
          + Crear otra organización
        </Link>

        <p className="text-center text-sm">
          <Link href="/apply" className="text-neutral-500 hover:text-neutral-300 underline">
            Volver a mis postulaciones
          </Link>
        </p>
      </div>
    </div>
  );
}
