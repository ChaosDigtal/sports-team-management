"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Badge, EmptyRow, accountTone, inputClass, secondaryBtn, tdClass, thClass } from "@/components/ui";
import { chromeRemoteLabel } from "@/lib/constants";
import { teamShare } from "@/lib/format";
import { formatAccountTime, isWorkingAccountTime } from "@/lib/time";
import type { AccountRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type ColumnId =
  | "name"
  | "country"
  | "share"
  | "email"
  | "accountPassword"
  | "accountTime"
  | "weekTarget"
  | "chromeRemote"
  | "anydeskId"
  | "anydeskPassword"
  | "emailPassword"
  | "whatsapp"
  | "phone"
  | "ultraviewerId"
  | "ultraviewerPassword"
  | "trainerEmail"
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
  { id: "weekTarget", label: "Weekly target" },
  { id: "chromeRemote", label: "Chrome Remote" },
  { id: "anydeskId", label: "AnyDesk ID" },
  { id: "anydeskPassword", label: "AnyDesk password" },
  { id: "emailPassword", label: "Email password" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "phone", label: "Phone" },
  { id: "ultraviewerId", label: "UltraViewer ID" },
  { id: "ultraviewerPassword", label: "UltraViewer password" },
  { id: "trainerEmail", label: "AI Datatrainer email" },
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
  "weekTarget",
  "chromeRemote",
  "anydeskId",
  "anydeskPassword",
  "status",
];

const MEMBER_DEFAULT: ColumnId[] = ADMIN_DEFAULT.filter((id) => id !== "share");

export function AccountsTable({
  accounts,
  canSeeShare,
  filters,
  search,
}: {
  accounts: AccountRow[];
  canSeeShare: boolean;
  filters: ReactNode;
  search: { q: string; status: string; country: string };
}) {
  const storageKey = canSeeShare ? "da-account-columns-admin" : "da-account-columns-member";
  const defaults = canSeeShare ? ADMIN_DEFAULT : MEMBER_DEFAULT;
  const [selected, setSelected] = useState<ColumnId[]>(defaults);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setSelected(withWeekTarget(sanitize(parsed, canSeeShare)));
      } catch {
        setSelected(canSeeShare ? ADMIN_DEFAULT : MEMBER_DEFAULT);
      }
    }
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [storageKey, canSeeShare]);

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

  const filtered = Boolean(search.q || search.status || search.country);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">{filters}</div>
        <form method="get" className="ml-auto flex shrink-0 items-center gap-2">
          {search.status ? <input type="hidden" name="status" value={search.status} /> : null}
          {search.country ? <input type="hidden" name="country" value={search.country} /> : null}
          {filtered ? (
            <Link href="/accounts" className="text-sm font-medium text-accent">
              Clear
            </Link>
          ) : null}
          <div className="w-56">
            <input className={inputClass} name="q" defaultValue={search.q} placeholder="Search" aria-label="Search accounts" />
          </div>
          <div className="relative">
          <button type="button" className={secondaryBtn} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            Columns
          </button>
          {open ? (
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-line bg-white p-3 shadow-lg">
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
                        const next = event.target.checked
                          ? [...selected, column.id]
                          : selected.filter((id) => id !== column.id);
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
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#f6f8fa]">
            <tr>
              {visible.map((column) => (
                <th key={column.id} className={cn(thClass, "!text-center")}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {accounts.length === 0 ? <EmptyRow colSpan={visible.length}>No accounts match.</EmptyRow> : null}
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-[#f7faf9]">
                {visible.map((column) => (
                  <td key={column.id} className={cn(tdClass, "!text-center", column.id === "share" && "tabular-nums")}>
                    <Cell account={account} column={column.id} now={now} />
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

function withWeekTarget(columns: ColumnId[]) {
  if (columns.includes("weekTarget")) return columns;
  const next = [...columns];
  const status = next.indexOf("status");
  next.splice(status === -1 ? next.length : status, 0, "weekTarget");
  return next;
}

function WeekTargetBar({
  target,
  project,
  qualification,
  survey,
}: {
  target: number | null;
  project: number;
  qualification: number;
  survey: number;
}) {
  const total = project + qualification + survey;
  const hasTarget = target != null && target > 0;
  const over = hasTarget && total > target;
  const basis = hasTarget ? (over ? total : target) : Math.max(total, 1);
  const parts = [
    { label: "Project", hours: project, className: "bg-green-500" },
    { label: "Qualification", hours: qualification, className: "bg-blue-500" },
    { label: "Survey", hours: survey, className: "bg-yellow-400" },
  ];
  const title = `${parts.map((part) => `${part.label} ${part.hours.toFixed(1)}h`).join(" · ")}${hasTarget ? ` · Target ${target.toFixed(1)}h` : ""}`;
  return (
    <div className="mx-auto w-40" title={title}>
      <div className={cn("flex h-2.5 overflow-hidden rounded-full bg-slate-300", over && "ring-2 ring-red-500 ring-offset-1")}>
        {parts.map((part) =>
          part.hours > 0 ? <div key={part.label} className={cn("h-full", part.className)} style={{ width: `${(part.hours / basis) * 100}%` }} /> : null,
        )}
      </div>
      <div className={cn("mt-1 text-xs tabular-nums", over ? "font-semibold text-red-600" : "text-muted")}>
        {over ? "Over · " : ""}
        {total.toFixed(1)}
        {hasTarget ? ` / ${target.toFixed(1)}h` : "h"}
      </div>
    </div>
  );
}

function Cell({ account, column, now }: { account: AccountRow; column: ColumnId; now: Date | null }) {
  if (column === "name") {
    return (
      <>
        <Link
          href={`/accounts/${account.id}`}
          className="font-semibold text-accent underline decoration-accent/50 decoration-2 underline-offset-2 hover:text-accent-ink hover:decoration-accent"
        >
          {account.name}
        </Link>
        <div className="mt-0.5 font-mono text-xs text-muted">{account.id}</div>
      </>
    );
  }
  if (column === "country") return <CountryTag country={account.country} />;
  if (column === "share") return <span>{teamShare(account.sharingPercent)}</span>;
  if (column === "email") return <span className="break-all">{account.email || "—"}</span>;
  if (column === "accountPassword") return <SecretCell value={account.accountPassword} />;
  if (column === "accountTime") {
    const outside = now != null && !isWorkingAccountTime(now, account.timezone);
    return <span className={cn("tabular-nums", outside && "font-semibold text-red-600")}>{now ? formatAccountTime(now, account.timezone) : "—"}</span>;
  }
  if (column === "weekTarget") {
    return (
      <WeekTargetBar
        target={account.weeklyTargetHours}
        project={account.weekProjectHours}
        qualification={account.weekQualificationHours}
        survey={account.weekSurveyHours}
      />
    );
  }
  if (column === "chromeRemote") return <ChromeRemoteTag value={account.chromeRemote} />;
  if (column === "anydeskId") return <span className="font-mono text-xs">{account.anydeskId || "—"}</span>;
  if (column === "anydeskPassword") return <SecretCell value={account.anydeskPassword} />;
  if (column === "emailPassword") return <SecretCell value={account.emailPassword} />;
  if (column === "whatsapp") return <span>{account.whatsapp || "—"}</span>;
  if (column === "phone") return <span>{account.phone || "—"}</span>;
  if (column === "ultraviewerId") return <span className="font-mono text-xs">{account.ultraviewerId || "—"}</span>;
  if (column === "ultraviewerPassword") return <SecretCell value={account.ultraviewerPassword} />;
  if (column === "trainerEmail") return <span className="break-all">{account.trainerEmail || "—"}</span>;
  if (column === "timezone") return <span>{account.timezone || "—"}</span>;
  if (column === "gender") return <span>{account.gender || "—"}</span>;
  if (column === "race") return <span>{account.race || "—"}</span>;
  return <Badge tone={accountTone(account.status)}>{account.status}</Badge>;
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
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", COUNTRY_TAG[country] ?? "bg-slate-100 text-slate-700 ring-slate-500/15")}>{country}</span>;
}

function ChromeRemoteTag({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex max-w-56 items-center rounded-full px-2 py-0.5 text-xs font-medium break-all ring-1 ring-inset", CHROME_TAG[value] ?? "bg-slate-100 text-slate-700 ring-slate-500/15")}>
      {chromeRemoteLabel(value)}
    </span>
  );
}

function SecretCell({ value }: { value: string }) {
  if (!value) return <>—</>;
  return <span className="break-all font-mono text-xs">{value}</span>;
}

function sanitize(value: unknown[], canSeeShare: boolean): ColumnId[] {
  const allowed = new Set(COLUMNS.filter((column) => !column.managersOnly || canSeeShare).map((column) => column.id));
  const next = value.filter((item): item is ColumnId => typeof item === "string" && allowed.has(item as ColumnId));
  if (!next.includes("name")) next.unshift("name");
  return next;
}
