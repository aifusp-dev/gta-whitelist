import { GoogleSignInButton } from "@/components/google-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <div className="mx-auto w-14 h-14 rounded-xl bg-violet-600 flex items-center justify-center text-2xl font-bold">
            W
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Whitelist</h1>
          <p className="text-sm text-neutral-400">
            Inicia sesión con Google para continuar
          </p>
        </div>

        {error === "google" && (
          <p className="text-sm text-red-400">
            No se pudo iniciar sesión con Google. Inténtalo de nuevo.
          </p>
        )}

        <GoogleSignInButton />

        <p className="text-xs text-neutral-500">
          Necesitas una cuenta de Google para acceder. No hay registro con email y contraseña.
        </p>
      </div>
    </div>
  );
}
