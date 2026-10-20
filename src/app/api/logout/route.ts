import { NextResponse } from "next/server";
import { redirectUrl } from "@/lib/request-origin";
import { SESSION_COOKIE } from "@/lib/session-token";

export async function POST(request: Request) {
  const response = NextResponse.redirect(redirectUrl(request, "/login"), { status: 303 });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
