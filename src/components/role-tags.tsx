import { PLATFORMS } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const TAG_CLASS: Record<string, string> = {
  super: "bg-violet-50 text-violet-800 ring-violet-600/20",
  "da:platform_admin": "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  "da:member": "bg-teal-50 text-teal-900 ring-teal-600/20",
  "handshake:platform_admin": "bg-sky-50 text-sky-900 ring-sky-600/20",
  "handshake:member": "bg-blue-50 text-blue-800 ring-blue-600/20",
  "snorkel:platform_admin": "bg-amber-50 text-amber-900 ring-amber-600/20",
  "snorkel:member": "bg-orange-50 text-orange-900 ring-orange-600/20",
};

export function RoleTags({ user }: { user: SessionUser }) {
  const tags: Array<{ key: string; label: string; className: string }> = [];
  if (user.isSuperAdmin) tags.push({ key: "super", label: "Super admin", className: TAG_CLASS.super });
  for (const platform of PLATFORMS) {
    const role = user.roles[platform.id];
    if (!role) continue;
    tags.push({
      key: `${platform.id}:${role}`,
      label: `${platform.label} ${role === "platform_admin" ? "admin" : "member"}`,
      className: TAG_CLASS[`${platform.id}:${role}`],
    });
  }
  if (tags.length === 0) return <span className="text-muted">No role</span>;
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
      {tags.map((tag) => (
        <span key={tag.key} className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tag.className)}>
          {tag.label}
        </span>
      ))}
    </span>
  );
}
