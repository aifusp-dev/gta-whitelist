import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { exchangeCodeForTokens, fetchGoogleUserInfo, getAppUrl } from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("g_oauth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/login?error=google", getAppUrl()));
  }

  try {
    const { access_token } = await exchangeCodeForTokens(code);
    const profile = await fetchGoogleUserInfo(access_token);

    if (!profile.email_verified) {
      return NextResponse.redirect(new URL("/login?error=google", getAppUrl()));
    }

    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email: profile.email } });

      user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: { googleId: profile.sub, name: profile.name, image: profile.picture },
          })
        : await prisma.user.create({
            data: {
              email: profile.email,
              name: profile.name,
              googleId: profile.sub,
              image: profile.picture,
            },
          });
    } else {
      // Mantener nombre/avatar sincronizados con Google en cada login.
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: profile.name, image: profile.picture },
      });
    }

    await createSession(user.id);

    const response = NextResponse.redirect(new URL("/apply", getAppUrl()));
    response.cookies.delete("g_oauth_state");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=google", getAppUrl()));
  }
}
