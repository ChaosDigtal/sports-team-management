import { timingSafeEqual } from "node:crypto";
import { getDb, transaction } from "./db";
import type { AssessmentNotification } from "./types";

const NOTIFY_SECRET = process.env.NOTIFY_SECRET ?? "896de5719d48b328931562b0dfa4da66745e92fe990638e99829497767c2e67d";
const EVENTS = new Set(["started", "updated", "stuck", "ended"]);

export function notifySecretMatches(header: string) {
  const given = Buffer.from(header);
  const expected = Buffer.from(NOTIFY_SECRET);
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

export function ingestNotification(input: unknown) {
  const notification = parseNotification(input);
  if (!notification) return null;
  transaction(() => {
    applyNotification(notification);
    getDb()
      .prepare(`INSERT INTO "DA_assessment_notifications" (payload, created_at, delivered) VALUES (?, ?, 0)`)
      .run(JSON.stringify(notification), new Date().toISOString());
  });
  return notification;
}

export function takeNotifications() {
  return transaction(() => {
    const db = getDb();
    const rows = db
      .prepare(`SELECT id, payload FROM "DA_assessment_notifications" WHERE delivered = 0 ORDER BY id`)
      .all() as Array<{ id: number; payload: string }>;
    if (rows.length > 0) db.prepare(`UPDATE "DA_assessment_notifications" SET delivered = 1 WHERE delivered = 0`).run();
    return rows.flatMap((row) => {
      try {
        const parsed = parseNotification(JSON.parse(row.payload));
        return parsed ? [parsed] : [];
      } catch {
        return [];
      }
    });
  });
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
    "started at": toJstLocal(text(record["started at"])),
    "ended at": toJstLocal(text(record["ended at"])),
    stage: text(record.stage),
    error: text(record.error),
  };
}

function applyNotification(notification: AssessmentNotification) {
  const db = getDb();
  const existing = db.prepare(`SELECT id FROM "DA_assessments" WHERE id = ?`).get(notification.id);
  if (!existing) return;
  if (notification.event === "started") {
    db.prepare(`UPDATE "DA_assessments" SET status = 'Started', start_time = ?, stage = '' WHERE id = ?`).run(
      toJstLocal(notification["started at"]),
      notification.id,
    );
    return;
  }
  if (notification.event === "updated") {
    db.prepare(`UPDATE "DA_assessments" SET status = 'On Assessment', stage = ?, stuck = 0, stuck_error = '' WHERE id = ?`).run(
      notification.stage ?? "",
      notification.id,
    );
    return;
  }
  if (notification.event === "stuck") {
    db.prepare(`UPDATE "DA_assessments" SET stuck = 1, stuck_error = ? WHERE id = ?`).run(notification.error ?? "", notification.id);
    return;
  }
  db.prepare(`UPDATE "DA_assessments" SET status = 'Waiting', end_time = ?, stage = '', stuck = 0, stuck_error = '' WHERE id = ?`).run(
    toJstLocal(notification["ended at"]),
    notification.id,
  );
}

function text(value: unknown) {
  return value == null ? "" : String(value).slice(0, 500);
}

export function toJstLocal(value: string | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
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
