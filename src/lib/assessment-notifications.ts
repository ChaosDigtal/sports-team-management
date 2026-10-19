import { getDb } from "./db";
import type { AssessmentNotification } from "./types";

const NOTIFY_URL = "https://www.hehehe1012.com/da-starter-assessment-get-notifications";
const NOTIFY_SECRET = process.env.NOTIFY_SECRET ?? "896de5719d48b328931562b0dfa4da66745e92fe990638e99829497767c2e67d";
const EVENTS = new Set(["started", "updated", "stuck", "ended"]);

export async function pullNotifications() {
  let payload: unknown;
  try {
    const response = await fetch(NOTIFY_URL, {
      method: "GET",
      headers: { Accept: "application/json", "x-notify-secret": NOTIFY_SECRET },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    payload = await response.json();
  } catch {
    return [];
  }
  const incoming = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { notifications?: unknown }).notifications)
      ? (payload as { notifications: unknown[] }).notifications
      : [];
  return applyRemoteNotifications(incoming);
}

export function applyRemoteNotifications(incoming: unknown[]) {
  const applied: AssessmentNotification[] = [];
  for (const item of incoming) {
    const notification = parseNotification(item);
    if (!notification) continue;
    if (!applyNotification(notification)) continue;
    applied.push(notification);
  }
  return applied;
}

function parseNotification(input: unknown): AssessmentNotification | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const event = String(record.event ?? "");
  const id = Number(record.id);
  if (!EVENTS.has(event) || !Number.isInteger(id) || id <= 0) return null;
  return {
    event: event as AssessmentNotification["event"],
    id,
    name: text(record.name),
    "started at": toJstLocal(text(record["started at"])),
    "ended at": toJstLocal(text(record["ended at"])),
    stage: text(record.stage),
    error: text(record.error),
  };
}

function applyNotification(notification: AssessmentNotification) {
  const db = getDb();
  const id = resolveAssessmentId(notification);
  if (id == null) return false;
  notification.id = id;
  const updatedAt = new Date().toISOString();
  if (notification.event === "started") {
    db.prepare(`UPDATE "DA_assessments" SET status = 'Started', start_time = ?, stage = '', updated_at = ? WHERE id = ?`).run(
      toJstLocal(notification["started at"]),
      updatedAt,
      notification.id,
    );
    return true;
  }
  if (notification.event === "updated") {
    db.prepare(`UPDATE "DA_assessments" SET status = 'On Assessment', stage = ?, stuck = 0, stuck_error = '', updated_at = ? WHERE id = ?`).run(
      notification.stage ?? "",
      updatedAt,
      notification.id,
    );
    return true;
  }
  if (notification.event === "stuck") {
    db.prepare(`UPDATE "DA_assessments" SET stuck = 1, stuck_error = ?, updated_at = ? WHERE id = ?`).run(notification.error ?? "", updatedAt, notification.id);
    return true;
  }
  db.prepare(`UPDATE "DA_assessments" SET status = 'Waiting', end_time = ?, stage = '', stuck = 0, stuck_error = '', updated_at = ? WHERE id = ?`).run(
    toJstLocal(notification["ended at"]),
    updatedAt,
    notification.id,
  );
  return true;
}

function resolveAssessmentId(notification: AssessmentNotification) {
  const db = getDb();
  const existing = db.prepare(`SELECT id FROM "DA_assessments" WHERE id = ?`).get(notification.id) as { id: number } | undefined;
  if (existing) return existing.id;
  const name = notification.name?.trim();
  if (!name) return null;
  const matches = db
    .prepare(
      `SELECT s.id AS id FROM "DA_assessments" s JOIN "DA_candidates" c ON c.id = s.candidate_id WHERE c.name = ? ORDER BY s.id`,
    )
    .all(name) as Array<{ id: number }>;
  return matches.length === 1 ? matches[0].id : null;
}

function text(value: unknown) {
  return value == null ? "" : String(value).slice(0, 500);
}

function toJstLocal(value: string | undefined) {
  const raw = (value ?? "").trim().replace(/\s*JST$/i, "");
  if (!raw) return "";
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}T${us[4].padStart(2, "0")}:${us[5]}`;
  const wall = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (wall && !/(?:z|[+-]\d{2}:?\d{2})$/i.test(raw)) return `${wall[1]}T${wall[2]}:${wall[3]}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
