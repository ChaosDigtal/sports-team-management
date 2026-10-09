import { NextResponse } from "next/server";
import { getUserAuth } from "@/lib/queries";
import { verifyPassword } from "@/lib/passwords";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session-token";

export async function POST(request: Request) {
  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "").trim();
  const user = id ? getUserAuth(id) : null;
  const valid = user ? verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), { status: 303 });
  }
  const response = NextResponse.redirect(new URL("/dashboard", request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions());
  return response;
}
