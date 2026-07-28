import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

const publicRoutes = ["/login"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  const isPublic = publicRoutes.includes(path);

  if (!isPublic && !session?.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (path === "/login" && session?.userId) {
    return NextResponse.redirect(new URL("/apply", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Todo requiere sesión salvo /login, las rutas de OAuth (api/auth/*) y los
  // assets estáticos. /api/answers/flush SÍ queda protegido a propósito: el
  // sendBeacon de autosave necesita la cookie de sesión para identificar al postulante.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
