import Link from "next/link";
import type { ReactNode } from "react";
import { noticeText } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/types";

export const inputClass =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none ring-accent/25 placeholder:text-muted/70 focus:border-accent focus:ring-2";
export const labelClass = "mb-1.5 block text-sm font-medium";
export const hintClass = "mt-1 block text-xs leading-5 text-muted";
export const primaryBtn =
  "inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryBtn =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-medium hover:bg-canvas";
export const dangerBtn =
  "inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-danger hover:bg-red-50";
export const thClass = "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted";
export const tdClass = "px-4 py-3 align-middle";

const tones: Record<Tone, string> = {
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  warn: "bg-amber-50 text-amber-900 ring-amber-600/20",
  danger: "bg-red-50 text-red-800 ring-red-600/20",
  neutral: "bg-slate-100 text-slate-700 ring-slate-500/15",
  info: "bg-sky-50 text-sky-900 ring-sky-600/20",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone])}>
      {children}
    </span>
  );
}

export function YesNo({ value }: { value: boolean }) {
  return <Badge tone={value ? "ok" : "danger"}>{value ? "Yes" : "No"}</Badge>;
}

export function ProjectKindTag({ kind }: { kind: string }) {
  const tone = kind === "Survey" ? "warn" : kind === "Qualification" ? "info" : "ok";
  return <Badge tone={tone}>{kind}</Badge>;
}

export function accountTone(status: string): Tone {
  if (status === "Active") return "ok";
  if (status.startsWith("Suspended")) return "danger";
  return "neutral";
}

export function taskTone(status: string): Tone {
  if (status === "Completed") return "ok";
  if (status === "WIP") return "warn";
  return "neutral";
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1.5 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Notice({ notice }: { notice?: string }) {
  const text = notice ? noticeText(notice) : "";
  if (!text) return null;
  const caution = notice === "blocked" || notice === "tasks" || notice === "locked" || notice === "withdraw-empty";
  return (
    <div
      role="status"
      className={cn(
        "mb-4 rounded-md border px-3 py-2 text-sm",
        caution ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950",
      )}
    >
      {text}
    </div>
  );
}

export function Panel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {caption ? <p className="mt-0.5 text-xs leading-5 text-muted">{caption}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function AccessNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-lg rounded-lg border border-line bg-white px-5 py-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

export function Facts({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{item.label}</dt>
          <dd className="mt-1 text-sm break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ExternalLink({ href }: { href: string }) {
  if (!href) return <>—</>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="break-all text-accent hover:underline">
      {href}
    </a>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium hover:text-accent">
      {children}
    </Link>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
      {message}
    </div>
  );
}

export function blank(value: ReactNode) {
  if (value == null || value === "") return "—";
  return value;
}
