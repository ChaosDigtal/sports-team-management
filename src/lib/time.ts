export const WEEK_COUNT = 12;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function fixedOffsetHours(timeZone: string) {
  if (timeZone === "UTC") return 0;
  const match = /^UTC([+-])(\d{1,2})$/.exec(timeZone);
  if (!match) return null;
  const hours = Number(match[2]);
  if (!Number.isInteger(hours) || hours > 14) return null;
  return match[1] === "-" ? -hours : hours;
}

export function formatAccountTime(date: Date, timeZone: string) {
  const offset = fixedOffsetHours(timeZone);
  if (offset == null) return "—";
  const shifted = new Date(date.getTime() + offset * 3_600_000);
  let hour = shifted.getUTCHours();
  const minute = pad(shifted.getUTCMinutes());
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

export function isWorkingAccountTime(date: Date, timeZone: string) {
  const offset = fixedOffsetHours(timeZone);
  if (offset == null) return true;
  const shifted = new Date(date.getTime() + offset * 3_600_000);
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return minutes >= 8 * 60 && minutes <= 22 * 60;
}

function zonedParts(date: Date, timeZone: string) {
  const offset = fixedOffsetHours(timeZone);
  if (offset != null) {
    const shifted = new Date(date.getTime() + offset * 3_600_000);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][shifted.getUTCDay()],
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
    };
  }
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(formatted.map((part) => [part.type, part.value]));
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: map.weekday,
    hour,
    minute: Number(map.minute),
  };
}

export function jstDateKey(date: Date) {
  const parts = zonedParts(date, "Asia/Tokyo");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function weekStartKey(date: Date) {
  const parts = zonedParts(date, "Asia/Tokyo");
  const index = WEEKDAY_INDEX[parts.weekday];
  if (index == null) {
    throw new Error(`Unexpected weekday ${parts.weekday}`);
  }
  const sunday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  sunday.setUTCDate(sunday.getUTCDate() - index);
  return sunday.toISOString().slice(0, 10);
}

export function recentWeekKeys(count: number, now = new Date()) {
  const current = weekStartKey(now);
  const [year, month, day] = current.split("-").map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(new Date(Date.UTC(year, month - 1, day - i * 7)).toISOString().slice(0, 10));
  }
  return keys;
}

export function weekBounds(sundayKey: string) {
  const [year, month, day] = sundayKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0));
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

export const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function defaultWithdrawalMinutes(timeZone: string) {
  const offset = fixedOffsetHours(timeZone);
  if (offset != null && offset >= -8 && offset <= -3) return 23 * 60;
  return 15 * 60;
}

export function nextWeeklyInstant(weekday: number, minutes: number, now = new Date()) {
  const safeWeekday = weekday >= 0 && weekday <= 6 ? weekday : 4;
  const safeMinutes = minutes >= 0 && minutes <= 23 * 60 + 59 ? minutes : 23 * 60;
  const shifted = new Date(now.getTime() + 9 * 3_600_000);
  const currentMinutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  let delta = (safeWeekday - shifted.getUTCDay() + 7) % 7;
  if (delta === 0 && currentMinutes >= safeMinutes) delta = 7;
  const wall = new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() + delta,
      Math.floor(safeMinutes / 60),
      safeMinutes % 60,
      0,
      0,
    ),
  );
  return new Date(wall.getTime() - 9 * 3_600_000);
}

export function jstDayBounds(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

export function addDaysToKey(day: string, days: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

export function daysBetween(fromDay: string, toDay: string) {
  const [fromYear, fromMonth, fromDate] = fromDay.split("-").map(Number);
  const [toYear, toMonth, toDate] = toDay.split("-").map(Number);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDate) - Date.UTC(fromYear, fromMonth - 1, fromDate)) / 86400000,
  );
}

export function shortDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, date)));
}

export function weekRangeLabel(sundayKey: string) {
  const [year, month, day] = sundayKey.split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1, day + 6)).toISOString().slice(0, 10);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${end}T00:00:00Z`));
  return `Sun ${startLabel} – Sat ${endLabel}`;
}

export function toDatetimeLocalValue(iso: string, timeZone: string) {
  if (!iso) return "";
  const parts = zonedParts(new Date(iso), timeZone || "Asia/Tokyo");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function wallClockAsUtc(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

export function zonedLocalToUtc(local: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error("Invalid date");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    throw new Error("Invalid date");
  }
  const offset = fixedOffsetHours(timeZone);
  if (offset != null) {
    return new Date(Date.UTC(year, month - 1, day, hour, minute) - offset * 3_600_000);
  }
  let utc = Date.UTC(year, month - 1, day, hour, minute);
  const desired = utc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const got = wallClockAsUtc(new Date(utc), timeZone);
    const diff = desired - got;
    if (diff === 0) return new Date(utc);
    utc += diff;
  }
  return new Date(utc);
}

export function openMinutes(startIso: string, now = new Date()) {
  if (!startIso) return 0;
  return Math.max(0, (now.getTime() - new Date(startIso).getTime()) / 60000);
}

export function elapsedHours(startIso: string, endIso: string) {
  if (!startIso || !endIso) return null;
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (diff < 0) return null;
  return Math.round((diff / 3_600_000) * 100) / 100;
}

export function jstWallClockToIso(sundayKey: string, dayOffset: number, hour: number, minute = 0) {
  const [year, month, day] = sundayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + dayOffset, hour - 9, minute, 0)).toISOString();
}
