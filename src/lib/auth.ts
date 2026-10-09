import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "./queries";
import { readSession, SESSION_COOKIE } from "./session-token";
import type { PlatformId } from "./types";

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const id = await readSession(token);
    if (!id) return null;
    return getSessionUser(id);
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getPlatform(): Promise<PlatformId> {
  const jar = await cookies();
  const value = jar.get("platform")?.value;
  if (value === "handshake" || value === "snorkel" || value === "da") return value;
  return "da";
}
