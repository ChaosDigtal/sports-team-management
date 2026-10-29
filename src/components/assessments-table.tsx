"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AssessmentCells } from "@/components/assessment-row";
import { EmptyRow, NoCell, NoHead, thClass } from "@/components/ui";
import { LAPTOP_STATUSES } from "@/lib/constants";
import type { Assessment, AssessmentNotification } from "@/lib/types";
import { jstWallElapsedMinutes } from "@/lib/time";
import { buildHref, cn } from "@/lib/utils";

const columns = ["ID", "Name", "Referral Link", "Email", "Password", "WhatsApp", "Laptop Status", "Email Forwarding", "AnyDesk ID", "AnyDesk password", "Start time", "End time", "Update time", "Task ID", "Status"];
const PAGE_SIZE = 25;
const WAITING_LATE_MINUTES = 3 * 24 * 60;

export function AssessmentsTable({
  rows,
  filter,
  name,
  laptop,
  page,
  canEditLaptop,
  canFailWaiting,
}: {
  rows: Assessment[];
  filter: string;
  name: string;
  laptop: string;
  page: number;
  canEditLaptop: boolean;
  canFailWaiting: boolean;
}) {
  const [items, setItems] = useState(rows);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setItems(rows);
  }, [rows]);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let stopped = false;
    async function tick() {
      try {
        const response = await fetch("/api/assessment-notifications", { cache: "no-store" });
        if (!response.ok || stopped) return;
        const body = (await response.json()) as { notifications?: AssessmentNotification[] };
        const notifications = Array.isArray(body.notifications) ? body.notifications : [];
        if (notifications.length === 0 || stopped) return;
        setItems((current) => notifications.reduce(applyNotification, current));
      } catch {
        return;
      }
    }
    void tick();
    const timer = window.setInterval(() => void tick(), 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  const visible = items.filter((row) => {
    if (name && row.name !== name) return false;
    if (laptop && row.laptopStatus !== laptop) return false;
    if (!filter) return true;
    if (filter === "Stuck") return row.stuck;
    return row.status === filter;
  });
  const names = [...new Set(items.map((row) => row.name))].sort((left, right) => left.localeCompare(right));
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pages);
  const paged = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const query = { status: filter, name, laptop };

  return (
    <div>
    <div className="mb-3 flex flex-wrap items-center gap-4">
      <NameFilter name={name} names={names} />
      <LaptopFilter laptop={laptop} />
    </div>
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-header">
          <tr>
            <NoHead />
            {columns.map((column) => (
              <th key={column} className={cn(thClass, "!text-center")}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {paged.length === 0 ? <EmptyRow colSpan={columns.length + 1}>{filter || name || laptop ? "No assessments match." : "No assessments yet."}</EmptyRow> : null}
          {paged.map((row, index) => {
            const elapsed = now ? jstWallElapsedMinutes(row.startTime, now) : null;
            const sinceEnd = now ? jstWallElapsedMinutes(row.endTime, now) : null;
            const overtime = row.status === "On Assessment" && elapsed != null && elapsed > 180;
            const waitingLate = row.status === "Waiting" && sinceEnd != null && sinceEnd > WAITING_LATE_MINUTES;
            return (
            <tr
              key={row.id}
              className={cn("hover:bg-hover", (row.stuck || overtime) && "assessment-stuck", waitingLate && !row.stuck && !overtime && "assessment-waiting-late")}
              title={row.stuck ? row.stuckError : overtime ? "On assessment for more than 3 hours" : waitingLate ? "Waiting for more than 3 days after the end time" : undefined}
            >
              <NoCell value={(currentPage - 1) * PAGE_SIZE + index + 1} />
              <AssessmentCells
                row={row}
                canEditLaptop={canEditLaptop}
                canFailWaiting={canFailWaiting}
                onLaptop={(candidateId, laptopStatus) =>
                  setItems((current) => current.map((item) => (item.candidateId === candidateId ? { ...item, laptopStatus } : item)))
                }
              />
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <Pager page={currentPage} pages={pages} total={visible.length} query={query} />
    </div>
  );
}

function NameFilter({ name, names }: { name: string; names: string[] }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Account</span>
      <select
        className="h-9 min-w-48 rounded-md border border-line bg-surface px-2"
        value={name}
        aria-label="Filter by account name"
        onChange={(event) => {
          const params = new URLSearchParams(window.location.search);
          params.delete("notice");
          params.delete("page");
          if (event.target.value) params.set("name", event.target.value);
          else params.delete("name");
          const query = params.toString();
          router.push(query ? `/onboarding/assessments?${query}` : "/onboarding/assessments");
        }}
      >
        <option value="">All</option>
        {names.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function LaptopFilter({ laptop }: { laptop: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Laptop status</span>
      <select
        className="h-9 min-w-40 rounded-md border border-line bg-surface px-2"
        value={laptop}
        aria-label="Filter by laptop status"
        onChange={(event) => {
          const params = new URLSearchParams(window.location.search);
          params.delete("notice");
          params.delete("page");
          if (event.target.value) params.set("laptop", event.target.value);
          else params.delete("laptop");
          const query = params.toString();
          router.push(query ? `/onboarding/assessments?${query}` : "/onboarding/assessments");
        }}
      >
        <option value="">All</option>
        {LAPTOP_STATUSES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pager({
  page,
  pages,
  total,
  query,
}: {
  page: number;
  pages: number;
  total: number;
  query: { status: string; name: string; laptop: string };
}) {
  if (total === 0) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(total, page * PAGE_SIZE);
  const href = (next: number) => buildHref("/onboarding/assessments", { ...query, page: next <= 1 ? "" : String(next) });
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">
        {start}–{end} of {total}
      </p>
      {pages > 1 ? (
        <div className="flex items-center gap-2">
          <Link href={href(page - 1)} className={cn("rounded-md border border-line bg-surface px-3 py-1", page <= 1 && "pointer-events-none opacity-40")} aria-disabled={page <= 1}>
            Previous
          </Link>
          <span className="tabular-nums text-muted">
            {page} / {pages}
          </span>
          <Link href={href(page + 1)} className={cn("rounded-md border border-line bg-surface px-3 py-1", page >= pages && "pointer-events-none opacity-40")} aria-disabled={page >= pages}>
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function applyNotification(rows: Assessment[], notification: AssessmentNotification) {
  return rows.map((row) => {
    if (row.id !== notification.id) return row;
    if (notification.event === "started") {
      return { ...row, status: "Started", stage: "", startTime: notification["started at"] || row.startTime, updatedAt: "" };
    }
    if (notification.event === "updated") {
      return { ...row, status: "On Assessment", stage: notification.stage ?? "", stuck: false, stuckError: "", updatedAt: "" };
    }
    if (notification.event === "stuck") {
      return { ...row, stuck: true, stuckError: notification.error ?? "" };
    }
    return { ...row, status: "Waiting", stage: "", endTime: notification["ended at"] || row.endTime, stuck: false, stuckError: "", updatedAt: "" };
  });
}
