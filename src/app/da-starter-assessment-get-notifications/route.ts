import { ingestNotification, notifySecretMatches, takeNotifications } from "@/lib/assessment-notifications";

export const dynamic = "force-dynamic";

async function receive(request: Request) {
  if (!notifySecretMatches(request.headers.get("x-notify-secret") ?? "")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (request.method === "POST") {
    const body = await readBody(request);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const record = body as Record<string, unknown>;
      if (typeof record.event === "string") {
        ingestNotification(record);
        return Response.json({ notifications: [] });
      }
      if (Array.isArray(record.notifications)) {
        for (const item of record.notifications) ingestNotification(item);
        return Response.json({ notifications: [] });
      }
    }
  }
  return Response.json({ notifications: takeNotifications() });
}

async function readBody(request: Request) {
  const text = await request.text();
  if (!text.trim()) return null;
  if (text.length > 20_000) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function GET(request: Request) {
  return receive(request);
}

export function POST(request: Request) {
  return receive(request);
}
