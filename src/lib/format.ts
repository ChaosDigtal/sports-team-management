import { fixedOffsetHours, WEEKDAY_LABELS } from "./time";

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatHours(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)} h`;
}

export function formatLogged(hours: number | null | undefined) {
  if (hours == null || Number.isNaN(hours)) return "—";
  return formatDuration(Math.round(hours * 60));
}

export function formatDuration(totalMinutes: number | null | undefined) {
  if (totalMinutes == null || Number.isNaN(totalMinutes)) return "—";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function formatDurationRange(start: number | null, end: number | null) {
  if (start == null && end == null) return "—";
  return `${formatDuration(start)} – ${formatDuration(end)}`;
}

export function durationParts(totalMinutes: number | null | undefined) {
  if (totalMinutes == null) return { hours: "", minutes: "" };
  return { hours: String(Math.floor(totalMinutes / 60)), minutes: String(totalMinutes % 60) };
}

export function shareLabel(ratio: number) {
  if (!Number.isFinite(ratio) || ratio <= 0) return "0%";
  const pct = ratio * 100;
  if (pct >= 99.95) return "100%";
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

export function teamShare(value: number | null) {
  if (value == null) return "—";
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

export function formatClock(totalMinutes: number) {
  const safe = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(safe / 60);
  const minute = safe % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function clockValue(totalMinutes: number) {
  const safe = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function formatWithdrawalSchedule(weekday: number, totalMinutes: number) {
  const day = WEEKDAY_LABELS[weekday] ?? "Thursday";
  return `${day}, ${formatClock(totalMinutes)} JST`;
}

export function formatDay(day: string) {
  if (!day) return "—";
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, date)));
}

export function formatDateTime(iso: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTimestamp(iso: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatWhen(iso: string, timeZone: string) {
  if (!iso) return "—";
  const offset = fixedOffsetHours(timeZone);
  const date = offset == null ? new Date(iso) : new Date(new Date(iso).getTime() + offset * 3_600_000);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: offset == null ? timeZone || "Asia/Tokyo" : "UTC",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function moneyAxis(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    return `$${compact >= 10 ? compact.toFixed(0) : compact.toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
}

export function computeEarning(logged: number | null, rate: number | null) {
  if (logged == null || rate == null) return null;
  return round2(logged * rate);
}

export function relativeDay(day: string, today: string) {
  if (!day || !today) return "";
  const [fy, fm, fd] = today.split("-").map(Number);
  const [ty, tm, td] = day.split("-").map(Number);
  const diff = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff > 1) return `in ${diff} days`;
  if (diff === -1) return "yesterday";
  return `${Math.abs(diff)} days ago`;
}
