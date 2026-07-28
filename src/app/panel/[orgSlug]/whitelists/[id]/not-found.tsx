import Link from "next/link";

export default function WhitelistNotFound() {
  return (
    <div className="text-center space-y-3 py-16">
      <h1 className="text-xl font-bold">Whitelist no encontrada</h1>
      <p className="text-sm text-neutral-400">No existe o no pertenece a esta organización.</p>
      <Link href="/panel" className="text-sm text-violet-400 hover:underline">
        Volver
      </Link>
    </div>
  );
}
