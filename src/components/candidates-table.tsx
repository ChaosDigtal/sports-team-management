"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Badge, EmptyRow, candidateTone, inputClass, secondaryBtn, tdClass, thClass } from "@/components/ui";
import { chromeRemoteLabel } from "@/lib/constants";
import { teamShare } from "@/lib/format";
import { formatAccountTime, isWorkingAccountTime } from "@/lib/time";
import type { Candidate } from "@/lib/types";
import { cn, softTag } from "@/lib/utils";

type ColumnId =
  | "name"
  | "country"
  | "share"
  | "email"
  | "accountPassword"
  | "accountTime"
  | "chromeRemote"
  | "anydeskId"
  | "anydeskPassword"
  | "emailPassword"
  | "whatsapp"
  | "phone"
  | "ultraviewerId"
  | "ultraviewerPassword"
  | "timezone"
  | "gender"
  | "race"
  | "status";

const COLUMNS: Array<{ id: ColumnId; label: string; managersOnly?: boolean }> = [
  { id: "name", label: "Name" },
  { id: "country", label: "Country" },
  { id: "share", label: "Profit share", managersOnly: true },
  { id: "email", label: "Email" },
  { id: "accountPassword", label: "Account password" },
  { id: "accountTime", label: "Account time" },
  { id: "chromeRemote", label: "Chrome Remote" },
  { id: "anydeskId", label: "AnyDesk ID" },
  { id: "anydeskPassword", label: "AnyDesk password" },
  { id: "emailPassword", label: "Email password" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "phone", label: "Phone" },
  { id: "ultraviewerId", label: "UltraViewer ID" },
  { id: "ultraviewerPassword", label: "UltraViewer password" },
  { id: "timezone", label: "Timezone" },
  { id: "gender", label: "Gender" },
  { id: "race", label: "Race" },
  { id: "status", label: "Status" },
];

const ADMIN_DEFAULT: ColumnId[] = [
  "name",
  "country",
  "share",
  "email",
  "accountPassword",
  "accountTime",
  "chromeRemote",
  "anydeskId",
  "anydeskPassword",
  "status",
];

const MEMBER_DEFAULT: ColumnId[] = ADMIN_DEFAULT.filter((id) => id !== "share");

export function CandidatesTable({
  candidates,
  canSeeShare,
  filters,
  search,
}: {
  candidates: Candidate[];
  canSeeShare: boolean;
  filters: ReactNode;
  search: { q: string; status: string; country: string; noResume: boolean; noLinkedin: boolean };
}) {
  const storageKey = canSeeShare ? "da-candidate-columns-admin" : "da-candidate-columns-member";
  const defaults = canSeeShare ? ADMIN_DEFAULT : MEMBER_DEFAULT;
  const [selected, setSelected] = useState<ColumnId[]>(defaults);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setSelected(sanitize(parsed, canSeeShare));
      } catch {
        setSelected(defaults);
      }
    }
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [storageKey, canSeeShare, defaults]);

  function update(next: ColumnId[]) {
    const clean = sanitize(next, canSeeShare);
    setSelected(clean);
    window.localStorage.setItem(storageKey, JSON.stringify(clean));
  }

  const available = COLUMNS.filter((column) => !column.managersOnly || canSeeShare);
  const visible = [
    ...COLUMNS.filter((column) => column.id !== "status" && selected.includes(column.id) && (!column.managersOnly || canSeeShare)),
    ...COLUMNS.filter((column) => column.id === "status" && selected.includes("status")),
  ];
  const filtered = Boolean(search.q || search.status || search.country || search.noResume || search.noLinkedin);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">{filters}</div>
        <form method="get" className="ml-auto flex shrink-0 items-center gap-2">
          {search.status ? <input type="hidden" name="status" value={search.status} /> : null}
          {search.country ? <input type="hidden" name="country" value={search.country} /> : null}
          {search.noResume ? <input type="hidden" name="noResume" value="1" /> : null}
          {search.noLinkedin ? <input type="hidden" name="noLinkedin" value="1" /> : null}
          {filtered ? (
            <Link href="/onboarding" className="text-sm font-medium text-accent">
              Clear
            </Link>
          ) : null}
          <div className="w-56">
            <input className={inputClass} name="q" defaultValue={search.q} placeholder="Search" aria-label="Search candidates" />
          </div>
          <div className="relative">
            <button type="button" className={secondaryBtn} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
              Columns
            </button>
            {open ? (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-line bg-surface p-3 shadow-lg">
                <p className="mb-2 text-xs text-muted">Choose what this table shows. Name stays on.</p>
                <div className="grid max-h-80 gap-1 overflow-y-auto">
                  {available.map((column) => (
                    <label key={column.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-accent"
                        checked={selected.includes(column.id)}
                        disabled={column.id === "name"}
                        onChange={(event) => {
                          const next = event.target.checked ? [...selected, column.id] : selected.filter((id) => id !== column.id);
                          update(next);
                        }}
                      />
                      {column.label}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-accent"
                  onClick={() => {
                    window.localStorage.removeItem(storageKey);
                    setSelected(defaults);
                  }}
                >
                  Reset to default
                </button>
              </div>
            ) : null}
          </div>
        </form>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-header">
            <tr>
              {visible.map((column) => (
                <th key={column.id} className={cn(thClass, "!text-center")}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {candidates.length === 0 ? <EmptyRow colSpan={visible.length}>No candidates match.</EmptyRow> : null}
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="hover:bg-hover">
                {visible.map((column) => (
                  <td key={column.id} className={cn(tdClass, "!text-center", column.id === "share" && "tabular-nums")}>
                    <Cell candidate={candidate} column={column.id} now={now} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ candidate, column, now }: { candidate: Candidate; column: ColumnId; now: Date | null }) {
  if (column === "name") {
    return (
      <>
        <Link
          href={`/onboarding/${candidate.id}`}
          className="font-semibold text-accent underline decoration-accent/50 decoration-2 underline-offset-2 hover:text-accent-ink hover:decoration-accent"
        >
          {candidate.name}
        </Link>
        <div className="mt-0.5 font-mono text-xs text-muted">{candidate.id}</div>
      </>
    );
  }
  if (column === "country") return <CountryTag country={candidate.country} />;
  if (column === "share") return <span>{teamShare(candidate.sharingPercent)}</span>;
  if (column === "email") return <span className="break-all">{candidate.email || "—"}</span>;
  if (column === "accountPassword") return <span className="break-all font-mono text-xs">{candidate.accountPassword || "—"}</span>;
  if (column === "accountTime") {
    const outside = now != null && !isWorkingAccountTime(now, candidate.timezone);
    return <span className={cn("tabular-nums", outside && "font-semibold text-red-600")}>{now ? formatAccountTime(now, candidate.timezone) : "—"}</span>;
  }
  if (column === "chromeRemote") return <ChromeRemoteTag value={candidate.chromeRemote} />;
  if (column === "anydeskId") return <span className="font-mono text-xs">{candidate.anydeskId || "—"}</span>;
  if (column === "anydeskPassword") return <span className="break-all font-mono text-xs">{candidate.anydeskPassword || "—"}</span>;
  if (column === "emailPassword") return <span className="break-all font-mono text-xs">{candidate.emailPassword || "—"}</span>;
  if (column === "whatsapp") return <span>{candidate.whatsapp || "—"}</span>;
  if (column === "phone") return <span>{candidate.phone || "—"}</span>;
  if (column === "ultraviewerId") return <span className="font-mono text-xs">{candidate.ultraviewerId || "—"}</span>;
  if (column === "ultraviewerPassword") return <span className="break-all font-mono text-xs">{candidate.ultraviewerPassword || "—"}</span>;
  if (column === "timezone") return <span>{candidate.timezone || "—"}</span>;
  if (column === "gender") return <span>{candidate.gender || "—"}</span>;
  if (column === "race") return <span>{candidate.race || "—"}</span>;
  return <Badge tone={candidateTone(candidate.status)}>{candidate.status}</Badge>;
}

const COUNTRY_TAG: Record<string, string> = {
  US: "bg-blue-50 text-blue-800 ring-blue-600/20",
  CA: "bg-red-50 text-red-800 ring-red-600/20",
  NO: "bg-sky-50 text-sky-900 ring-sky-600/20",
  SW: "bg-amber-50 text-amber-900 ring-amber-600/20",
  UK: "bg-violet-50 text-violet-800 ring-violet-600/20",
};

const CHROME_TAG: Record<string, string> = {
  "": "bg-slate-100 text-slate-700 ring-slate-500/15",
  "pierre420375@gmail.com": "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  "digitalaicrew01@gmail.com": "bg-indigo-50 text-indigo-800 ring-indigo-600/20",
};

function CountryTag({ country }: { country: string }) {
  if (!country) return <>—</>;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", softTag(COUNTRY_TAG[country] ?? "bg-slate-100 text-slate-700 ring-slate-500/15"))}>
      {country}
    </span>
  );
}

function ChromeRemoteTag({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex max-w-56 items-center rounded-full px-2 py-0.5 text-xs font-medium break-all ring-1 ring-inset", softTag(CHROME_TAG[value] ?? "bg-slate-100 text-slate-700 ring-slate-500/15"))}>
      {chromeRemoteLabel(value)}
    </span>
  );
}

function sanitize(value: unknown[], canSeeShare: boolean): ColumnId[] {
  const allowed = new Set(COLUMNS.filter((column) => !column.managersOnly || canSeeShare).map((column) => column.id));
  const next = value.filter((item): item is ColumnId => typeof item === "string" && allowed.has(item as ColumnId));
  if (!next.includes("name")) next.unshift("name");
  return next;
}
