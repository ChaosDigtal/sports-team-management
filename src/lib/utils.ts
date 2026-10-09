export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function one(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function buildHref(path: string, params: Record<string, string | undefined | null>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export function noticeText(notice: string) {
  if (notice === "saved") return "Changes saved.";
  if (notice === "deleted") return "Deleted.";
  if (notice === "blocked") return "That record still has tasks, so it was kept.";
  if (notice === "tasks") return "This person has logged tasks, so the login was kept.";
  if (notice === "locked") return "That login stays. Keep at least one super admin, and keep your own login.";
  if (notice === "withdrawn") return "Withdrawal recorded. Status is Processing.";
  if (notice === "withdraw-empty") return "Nothing is available to withdraw yet.";
  return "";
}
