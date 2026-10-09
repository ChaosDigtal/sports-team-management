import type { AccountStatus, PlatformId, ProjectKind, TaskStatus, WithdrawalStatus } from "./types";

export const PLATFORMS: Array<{ id: PlatformId; label: string; state: "live" | "soon" }> = [
  { id: "da", label: "DA", state: "live" },
  { id: "handshake", label: "Handshake", state: "soon" },
  { id: "snorkel", label: "Snorkel", state: "soon" },
];

export const ACCOUNT_STATUSES: AccountStatus[] = [
  "Active",
  "Suspended (Work Quality)",
  "Suspended (No projects)",
  "Suspended (Before Work)",
];

export function isSuspendedStatus(status: string) {
  return status.startsWith("Suspended");
}

export const TASK_STATUSES: TaskStatus[] = ["WIP", "Completed", "Exited"];
export const WITHDRAWAL_STATUSES: WithdrawalStatus[] = ["Processing", "Paid"];

export const CHROME_REMOTE_OPTIONS = [
  { value: "", label: "None" },
  { value: "pierre420375@gmail.com", label: "pierre420375@gmail.com" },
  { value: "digitalaicrew01@gmail.com", label: "digitalaicrew01@gmail.com" },
];

export const GENDERS = ["Man", "Woman", "Non-binary", "Other", "Prefer not to answer"];
export const RACES = [
  "White",
  "Hispanic or Latino",
  "Black or African American",
  "Middle Eastern",
  "East Asian",
  "South Asian",
  "Other",
  "Prefer not to answer",
];
export const PROJECT_KINDS: ProjectKind[] = ["Project", "Survey", "Qualification"];

export const COUNTRIES = [
  { id: "US", label: "United States (US)" },
  { id: "CA", label: "Canada (CA)" },
  { id: "NO", label: "Norway (NO)" },
  { id: "SW", label: "Sweden (SW)" },
  { id: "UK", label: "United Kingdom (UK)" },
];

export const ACCOUNT_TIMEZONES = [
  { id: "UTC-8", label: "UTC-8" },
  { id: "UTC-7", label: "UTC-7" },
  { id: "UTC-6", label: "UTC-6" },
  { id: "UTC-5", label: "UTC-5" },
  { id: "UTC-4", label: "UTC-4" },
  { id: "UTC", label: "UTC" },
  { id: "UTC+1", label: "UTC+1" },
  { id: "UTC+2", label: "UTC+2" },
  { id: "UTC+3", label: "UTC+3" },
];

export const TIMEZONES = [
  { id: "Asia/Tokyo", label: "Japan (JST)" },
  { id: "Asia/Manila", label: "Philippines" },
  { id: "Asia/Kolkata", label: "India" },
  { id: "Asia/Shanghai", label: "China" },
  { id: "Asia/Singapore", label: "Singapore" },
  { id: "Europe/London", label: "United Kingdom" },
  { id: "Europe/Berlin", label: "Central Europe" },
  { id: "America/New_York", label: "US Eastern" },
  { id: "America/Chicago", label: "US Central" },
  { id: "America/Denver", label: "US Mountain" },
  { id: "America/Los_Angeles", label: "US Pacific" },
  { id: "America/Sao_Paulo", label: "São Paulo" },
  { id: "Pacific/Auckland", label: "New Zealand" },
  { id: "UTC", label: "UTC" },
];

export function timezoneLabel(id: string) {
  return ACCOUNT_TIMEZONES.find((zone) => zone.id === id)?.label ?? TIMEZONES.find((zone) => zone.id === id)?.label ?? id;
}

export function countryLabel(id: string) {
  return COUNTRIES.find((country) => country.id === id)?.label ?? (id || "—");
}

const ACCOUNT_OFFSET_TASK_ZONE: Record<string, string> = {
  "UTC-8": "America/Los_Angeles",
  "UTC-7": "America/Denver",
  "UTC-6": "America/Chicago",
  "UTC-5": "America/New_York",
  "UTC-4": "America/New_York",
  UTC: "UTC",
  "UTC+1": "Europe/Berlin",
  "UTC+2": "Europe/Berlin",
  "UTC+3": "Europe/Berlin",
};

export function taskZoneForAccount(value: string | undefined) {
  if (!value) return "Asia/Tokyo";
  if (TIMEZONES.some((zone) => zone.id === value)) return value;
  return ACCOUNT_OFFSET_TASK_ZONE[value] ?? "UTC";
}

export function chromeRemoteLabel(value: string) {
  return CHROME_REMOTE_OPTIONS.find((option) => option.value === value)?.label ?? (value || "None");
}
