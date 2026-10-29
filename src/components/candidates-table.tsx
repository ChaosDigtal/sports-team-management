"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { LaptopStatusSelect } from "@/components/laptop-status-select";
import { Badge, EmptyRow, NoCell, NoHead, candidateTone, inputClass, personNameClass, secondaryBtn, tdClass, thClass } from "@/components/ui";
import { chromeRemoteLabel } from "@/lib/constants";
import { teamShare } from "@/lib/format";
import { formatAccountTime, isWorkingAccountTime } from "@/lib/time";
import type { Candidate, LaptopStatus } from "@/lib/types";
import { cn, softTag } from "@/lib/utils";

type ColumnId =
  | "name"
  | "telegram"
  | "laptopStatus"
  | "emailForwarding"
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
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
  { id: "laptopStatus", label: "Laptop Status" },
  { id: "emailForwarding", label: "Email Forwarding" },
  { id: "country", label: "Country" },
  { id: "share", label: "Profit share", managersOnly: true },
  { id: "email", label: "Email" },
  { id: "accountPassword", label: "Account password" },
  { id: "accountTime", label: "Account time" },
  { id: "chromeRemote", label: "Chrome Remote" },
  { id: "anydeskId", label: "AnyDesk ID" },
  { id: "anydeskPassword", label: "AnyDesk password" },
  { id: "emailPassword", label: "Email password" },
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
  "laptopStatus",
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
  canEditLaptop,
  filters,
  search,
}: {
  candidates: Candidate[];
  canSeeShare: boolean;
  canEditLaptop: boolean;
  filters: ReactNode;
  search: { q: string; status: string; country: string; noResume: boolean; noLinkedin: boolean; laptop: string };
}) {
  const storageKey = canSeeShare ? "da-candidate-columns-admin" : "da-candidate-columns-member";
  const defaults = canSeeShare ? ADMIN_DEFAULT : MEMBER_DEFAULT;
  const [selected, setSelected] = useState<ColumnId[]>(defaults);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState(search.q);
  const [items, setItems] = useState(candidates);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setSelected(withLaptop(sanitize(parsed, canSeeShare)));
      } catch {
        setSelected(defaults);
      }
    }
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [storageKey, canSeeShare, defaults]);

  useEffect(() => {
    setQuery(search.q);
  }, [search.q]);

  useEffect(() => {
    setItems(candidates);
  }, [candidates]);

  function update(next: ColumnId[]) {
    const clean = sanitize(next, canSeeShare);
    setSelected(clean);
    window.localStorage.setItem(storageKey, JSON.stringify(clean));
  }

  const available = COLUMNS.filter((column) => !column.managersOnly || canSeeShare);
  const visible = [
    ...COLUMNS.filter((column) => column.id === "name"),
    ...COLUMNS.filter((column) => column.id === "whatsapp" && selected.includes("whatsapp")),
    ...COLUMNS.filter((column) => column.id === "telegram" && selected.includes("telegram")),
    ...COLUMNS.filter((column) => column.id === "laptopStatus" && selected.includes("laptopStatus")),
    ...COLUMNS.filter((column) => column.id === "emailForwarding" && selected.includes("emailForwarding")),
    ...COLUMNS.filter((column) => !["name", "whatsapp", "telegram", "laptopStatus", "emailForwarding", "status"].includes(column.id) && selected.includes(column.id) && (!column.managersOnly || canSeeShare)),
    ...COLUMNS.filter((column) => column.id === "status" && selected.includes("status")),
  ];
  const chipsOn = Boolean(search.status || search.country || search.noResume || search.noLinkedin || search.laptop);
  const needle = query.replace(/[%_]/g, "").trim().toLowerCase();
  const rows = needle ? items.filter((candidate) => candidateSearchText(candidate).includes(needle)) : items;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">{filters}</div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {chipsOn ? (
            <Link href="/onboarding" className="text-sm font-medium text-accent">
              Clear
            </Link>
          ) : query ? (
            <button type="button" className="text-sm font-medium text-accent" onClick={() => setQuery("")}>
              Clear
            </button>
          ) : null}
          <div className="w-56">
            <input
              className={inputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search candidates"
            />
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
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-header">
            <tr>
              <NoHead />
              {visible.map((column) => (
                <th key={column.id} className={cn(thClass, "!text-center")}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? <EmptyRow colSpan={visible.length + 1}>No candidates match.</EmptyRow> : null}
            {rows.map((candidate, index) => (
              <tr key={candidate.id} className={cn("hover:bg-hover", candidate.status === "In Review" && "candidate-in-review")}>
                <NoCell value={index + 1} />
                {visible.map((column) => (
                  <td key={column.id} className={cn(tdClass, "!text-center", column.id === "share" && "tabular-nums")}>
                    <Cell
                      candidate={candidate}
                      column={column.id}
                      now={now}
                      canEditLaptop={canEditLaptop}
                      onLaptop={(laptopStatus) =>
                        setItems((current) => current.map((item) => (item.id === candidate.id ? { ...item, laptopStatus } : item)))
                      }
                    />
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

function candidateSearchText(candidate: Candidate) {
  return [candidate.id, candidate.name, candidate.whatsapp, candidate.telegram, candidate.email, candidate.linkedinEmail, candidate.laptopPin, candidate.referralLink, candidate.anydeskId, candidate.phone, candidate.country, candidate.status]
    .join(" ")
    .toLowerCase();
}

function withLaptop(columns: ColumnId[]) {
  if (columns.includes("laptopStatus")) return columns;
  const next = [...columns];
  const name = next.indexOf("name");
  next.splice(name === -1 ? 0 : name + 1, 0, "laptopStatus");
  return next;
}

function Cell({
  candidate,
  column,
  now,
  canEditLaptop,
  onLaptop,
}: {
  candidate: Candidate;
  column: ColumnId;
  now: Date | null;
  canEditLaptop: boolean;
  onLaptop: (laptopStatus: LaptopStatus) => void;
}) {
  if (column === "name") {
    return (
      <>
        <Link
          href={`/onboarding/${candidate.id}`}
          className={personNameClass(candidate.status === "Active")}
        >
          {candidate.name}
        </Link>
        <div className="mt-0.5 font-mono text-xs text-muted">{candidate.id}</div>
      </>
    );
  }
  if (column === "telegram") return <span>{candidate.telegram || "—"}</span>;
  if (column === "laptopStatus") {
    return <LaptopStatusSelect candidateId={candidate.id} value={candidate.laptopStatus} disabled={!canEditLaptop} onChange={onLaptop} />;
  }
  if (column === "emailForwarding") return <span>{candidate.emailForwarding ? "Yes" : "No"}</span>;
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
