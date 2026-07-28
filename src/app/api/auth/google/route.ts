import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getGoogleAuthUrl } from "@/lib/google-oauth";

export async function GET() {
  const state = randomBytes(16).toString("hex");

  const response = NextResponse.redirect(getGoogleAuthUrl(state));
  response.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
