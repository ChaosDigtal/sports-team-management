"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, EmptyRow, NoCell, NoHead, taskTone, tdClass, thClass } from "@/components/ui";
import { formatDuration, formatLogged, formatMoney, formatWhen } from "@/lib/format";
import { formatAccountTime, isWorkingAccountTime, openMinutes } from "@/lib/time";
import type { Task } from "@/lib/types";
import { buildHref, cn, softTag } from "@/lib/utils";

const ASSIGNEE_COLORS = [
  "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  "bg-sky-50 text-sky-900 ring-sky-600/20",
  "bg-amber-50 text-amber-900 ring-amber-600/20",
  "bg-violet-50 text-violet-800 ring-violet-600/20",
  "bg-rose-50 text-rose-800 ring-rose-600/20",
  "bg-indigo-50 text-indigo-800 ring-indigo-600/20",
  "bg-teal-50 text-teal-900 ring-teal-600/20",
  "bg-orange-50 text-orange-900 ring-orange-600/20",
];

const ACCOUNT_COLORS = [
  "bg-blue-50 text-blue-800 ring-blue-600/20",
  "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-600/20",
  "bg-lime-50 text-lime-900 ring-lime-600/20",
  "bg-cyan-50 text-cyan-900 ring-cyan-600/20",
  "bg-pink-50 text-pink-800 ring-pink-600/20",
  "bg-yellow-50 text-yellow-900 ring-yellow-600/20",
  "bg-purple-50 text-purple-800 ring-purple-600/20",
  "bg-stone-100 text-stone-800 ring-stone-500/20",
];

export function TasksTable({
  tasks,
  canSeeEarnings,
  canSeePayout,
  sort,
  dir,
  filters,
}: {
  tasks: Task[];
  canSeeEarnings: boolean;
  canSeePayout: boolean;
  sort: string;
  dir: "asc" | "desc";
  filters: Record<string, string>;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const columns = 12 + (canSeeEarnings ? 1 : 0) + (canSeePayout ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-header">
          <tr>
            <NoHead />
            <SortTh label="Task" column="id" sort={sort} dir={dir} filters={filters} />
            <th className={cn(thClass, "!text-center")}>Account</th>
            <th className={cn(thClass, "!text-center")}>Assignee</th>
            <th className={cn(thClass, "!text-center")}>Project</th>
            <th className={cn(thClass, "!text-center")}>Account time</th>
            <SortTh label="Started (Local)" column="started" sort={sort} dir={dir} filters={filters} />
            <th className={cn(thClass, "!text-center")}>Elapsed</th>
            <SortTh label="Ended (Local)" column="ended" sort={sort} dir={dir} filters={filters} />
            <th className={cn(thClass, "!text-center")}>Time logged</th>
            <SortTh label="Rate" column="rate" sort={sort} dir={dir} filters={filters} />
            {canSeeEarnings ? <SortTh label="Earning" column="earnings" sort={sort} dir={dir} filters={filters} /> : null}
            <th className={cn(thClass, "!text-center")}>Status</th>
            {canSeePayout ? <th className={cn(thClass, "!text-center")}>Payout</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tasks.length === 0 ? <EmptyRow colSpan={columns}>No tasks match.</EmptyRow> : null}
          {tasks.map((task, index) => {
            const elapsed = task.status === "WIP" ? (now ? openMinutes(task.startTime, now) : null) : (task.elapsedHours ?? 0) * 60;
            const over = elapsed != null && task.status === "WIP" && task.maxAllowedMinutes != null && elapsed > task.maxAllowedMinutes;
            const outside = task.status === "WIP" && now != null && !isWorkingAccountTime(now, task.accountTimezone);
            return (
              <tr key={task.id} className={cn(over ? "bg-red-200 hover:bg-red-200 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-950" : "hover:bg-hover", outside && "task-wip-outside")}>
                <NoCell value={index + 1} />
                <td className={cn(tdClass, "!text-center")}>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="font-semibold text-accent underline decoration-accent/50 decoration-2 underline-offset-2 hover:text-accent-ink hover:decoration-accent"
                  >
                    <span className="font-mono text-xs">{task.id}</span>
                  </Link>
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <Link href={`/accounts/${task.accountId}`}>
                    <AccountTag id={task.accountId} name={task.accountName} />
                  </Link>
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <Link href={`/users/${task.userId}`}>
                    <AssigneeTag id={task.userId} name={task.userName} />
                  </Link>
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <Link href={`/projects/${task.projectId}`} className="font-medium text-accent hover:underline">
                    {task.projectName}
                  </Link>
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <span className={cn("tabular-nums", outside && "font-semibold text-red-600")}>
                    {now ? formatAccountTime(now, task.accountTimezone) : "—"}
                  </span>
                </td>
                <td className={cn(tdClass, "!text-center")}>{formatWhen(task.startTime, task.accountTimezone)}</td>
                <td className={cn(tdClass, "!text-center")}>
                  <ElapsedBar
                    startTime={task.status === "WIP" ? task.startTime : ""}
                    minutes={task.status === "WIP" ? null : (task.elapsedHours ?? 0) * 60}
                    limit={task.maxAllowedMinutes}
                  />
                </td>
                <td className={cn(tdClass, "!text-center")}>{task.endTime ? formatWhen(task.endTime, task.accountTimezone) : "—"}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{formatLogged(task.loggedHours)}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{task.rate == null ? "—" : formatMoney(task.rate)}</td>
                {canSeeEarnings ? (
                  <td className={cn(tdClass, "!text-center tabular-nums")}>{task.status === "Exited" ? "—" : formatMoney(task.earning)}</td>
                ) : null}
                <td className={cn(tdClass, "!text-center")}>
                  <Badge tone={taskTone(task.status)}>{task.status}</Badge>
                </td>
                {canSeePayout ? (
                  <td className={cn(tdClass, "!text-center")}>
                    {task.payoutStatus ? <Badge tone={payoutTone(task.payoutStatus)}>{task.payoutStatus}</Badge> : "—"}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function payoutTone(status: Task["payoutStatus"]) {
  if (status === "Paid") return "ok" as const;
  if (status === "Available") return "info" as const;
  return "warn" as const;
}

function SortTh({
  label,
  column,
  sort,
  dir,
  filters,
}: {
  label: string;
  column: string;
  sort: string;
  dir: "asc" | "desc";
  filters: Record<string, string>;
}) {
  const next = sort === column && dir === "asc" ? "desc" : "asc";
  const mark = sort === column ? (dir === "asc" ? " ↑" : " ↓") : "";
  return (
    <th className={cn(thClass, "!text-center")}>
      <Link href={buildHref("/tasks", { ...filters, sort: column, dir: next })} className="hover:text-ink">
        {label}
        {mark}
      </Link>
    </th>
  );
}

function colorIndex(id: string, size: number) {
  return [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % size;
}

function AccountTag({ id, name }: { id: string; name: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", softTag(ACCOUNT_COLORS[colorIndex(id, ACCOUNT_COLORS.length)]))}>
      {name}
    </span>
  );
}

function AssigneeTag({ id, name }: { id: string; name: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", softTag(ASSIGNEE_COLORS[colorIndex(id, ASSIGNEE_COLORS.length)]))}>
      {name}
    </span>
  );
}

function ElapsedBar({ startTime, minutes, limit }: { startTime: string; minutes: number | null; limit: number | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!startTime) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [startTime]);
  const elapsed = startTime ? (now == null ? null : openMinutes(startTime, new Date(now))) : minutes;
  const hasLimit = limit != null && limit > 0;
  const over = elapsed != null && hasLimit && elapsed > limit;
  const ratio = elapsed != null && hasLimit ? Math.min(1, Math.max(0, elapsed / limit)) : 0;
  const width = ratio === 0 ? 0 : Math.max(ratio * 100, 2);
  const elapsedLabel = elapsed == null ? "—" : formatDuration(Math.floor(elapsed));
  const limitLabel = hasLimit ? formatDuration(limit) : null;
  return (
    <div className="mx-auto w-40">
      {hasLimit ? (
        <div
          className={cn("overflow-hidden rounded-full", over && "ring-2 ring-red-500 ring-offset-1 ring-offset-surface")}
          style={{ height: 10, background: "#cbd5e1" }}
        >
          <div style={{ height: 10, width: `${Math.min(width, 100)}%`, background: over ? "#dc2626" : "#0d7a5f" }} />
        </div>
      ) : null}
      <div className={cn("mt-1 text-xs tabular-nums", over ? "font-semibold text-red-600" : "text-muted")}>
        {over ? "Over · " : ""}
        {elapsedLabel}
        {limitLabel ? ` / ${limitLabel}` : ""}
      </div>
    </div>
  );
}
