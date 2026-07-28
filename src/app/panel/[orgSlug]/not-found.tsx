import Link from "next/link";

export default function OrgNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <h1 className="text-xl font-bold">Organización no encontrada</h1>
        <p className="text-sm text-neutral-400">
          No existe o no tienes acceso a ella.
        </p>
        <Link href="/panel" className="text-sm text-violet-400 hover:underline">
          Volver a mis organizaciones
        </Link>
      </div>
    </div>
  );
}
