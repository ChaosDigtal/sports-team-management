import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "team_session";

const DEV_SECRET = "dev-only-team-console-secret-key-32bytes";

function key() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || DEV_SECRET);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

export async function signSession(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(key());
}

export async function readSession(token: string) {
  const { payload } = await jwtVerify(token, key());
  return payload.sub || null;
}
