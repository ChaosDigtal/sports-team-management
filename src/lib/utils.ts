export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const TAG_TONE: Record<string, string> = {
  "bg-amber-50": "bg-amber-200 text-amber-950 ring-amber-700/30 dark:bg-amber-900/80 dark:text-amber-100 dark:ring-amber-300/40",
  "bg-blue-50": "bg-blue-200 text-blue-950 ring-blue-700/30 dark:bg-blue-900/80 dark:text-blue-100 dark:ring-blue-300/40",
  "bg-cyan-50": "bg-cyan-200 text-cyan-950 ring-cyan-700/30 dark:bg-cyan-900/80 dark:text-cyan-100 dark:ring-cyan-300/40",
  "bg-emerald-50": "bg-emerald-200 text-emerald-950 ring-emerald-700/30 dark:bg-emerald-900/80 dark:text-emerald-100 dark:ring-emerald-300/40",
  "bg-fuchsia-50": "bg-fuchsia-200 text-fuchsia-950 ring-fuchsia-700/30 dark:bg-fuchsia-900/80 dark:text-fuchsia-100 dark:ring-fuchsia-300/40",
  "bg-green-50": "bg-green-200 text-green-950 ring-green-700/30 dark:bg-green-900/80 dark:text-green-100 dark:ring-green-300/40",
  "bg-indigo-50": "bg-indigo-200 text-indigo-950 ring-indigo-700/30 dark:bg-indigo-900/80 dark:text-indigo-100 dark:ring-indigo-300/40",
  "bg-lime-50": "bg-lime-200 text-lime-950 ring-lime-700/30 dark:bg-lime-900/80 dark:text-lime-100 dark:ring-lime-300/40",
  "bg-orange-50": "bg-orange-200 text-orange-950 ring-orange-700/30 dark:bg-orange-900/80 dark:text-orange-100 dark:ring-orange-300/40",
  "bg-pink-50": "bg-pink-200 text-pink-950 ring-pink-700/30 dark:bg-pink-900/80 dark:text-pink-100 dark:ring-pink-300/40",
  "bg-purple-50": "bg-purple-200 text-purple-950 ring-purple-700/30 dark:bg-purple-900/80 dark:text-purple-100 dark:ring-purple-300/40",
  "bg-red-50": "bg-red-200 text-red-950 ring-red-700/30 dark:bg-red-900/80 dark:text-red-100 dark:ring-red-300/40",
  "bg-rose-50": "bg-rose-200 text-rose-950 ring-rose-700/30 dark:bg-rose-900/80 dark:text-rose-100 dark:ring-rose-300/40",
  "bg-sky-50": "bg-sky-200 text-sky-950 ring-sky-700/30 dark:bg-sky-900/80 dark:text-sky-100 dark:ring-sky-300/40",
  "bg-slate-100": "bg-slate-200 text-slate-900 ring-slate-600/30 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-300/40",
  "bg-stone-100": "bg-stone-200 text-stone-900 ring-stone-600/30 dark:bg-stone-700 dark:text-stone-100 dark:ring-stone-300/40",
  "bg-teal-50": "bg-teal-200 text-teal-950 ring-teal-700/30 dark:bg-teal-900/80 dark:text-teal-100 dark:ring-teal-300/40",
  "bg-violet-50": "bg-violet-200 text-violet-950 ring-violet-700/30 dark:bg-violet-900/80 dark:text-violet-100 dark:ring-violet-300/40",
  "bg-yellow-50": "bg-yellow-200 text-yellow-950 ring-yellow-700/30 dark:bg-yellow-900/80 dark:text-yellow-100 dark:ring-yellow-300/40",
};

export function softTag(token: string) {
  const bg = token.split(/\s+/).find((part) => TAG_TONE[part]);
  return bg ? TAG_TONE[bg] : token;
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
