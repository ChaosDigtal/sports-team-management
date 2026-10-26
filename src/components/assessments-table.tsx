"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AssessmentCells } from "@/components/assessment-row";
import { EmptyRow, NoCell, NoHead, thClass } from "@/components/ui";
import type { Assessment, AssessmentNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

const columns = ["ID", "Name", "Referral Link", "Email", "Password", "WhatsApp", "Laptop Status", "Email Forwarding", "AnyDesk ID", "AnyDesk password", "Start time", "End time", "Update time", "Task ID", "Status"];

export function AssessmentsTable({
  rows,
  filter,
  name,
  canEditLaptop,
}: {
  rows: Assessment[];
  filter: string;
  name: string;
  canEditLaptop: boolean;
}) {
  const [items, setItems] = useState(rows);

  useEffect(() => {
    setItems(rows);
  }, [rows]);

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
    if (!filter) return true;
    if (filter === "Stuck") return row.stuck;
    return row.status === filter;
  });
  const names = [...new Set(items.map((row) => row.name))].sort((left, right) => left.localeCompare(right));

  return (
    <div>
    <NameFilter name={name} names={names} />
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
          {visible.length === 0 ? <EmptyRow colSpan={columns.length + 1}>{filter || name ? "No assessments match." : "No assessments yet."}</EmptyRow> : null}
          {visible.map((row, index) => (
            <tr key={row.id} className={cn("hover:bg-hover", row.stuck && "assessment-stuck")} title={row.stuck ? row.stuckError : undefined}>
              <NoCell value={index + 1} />
              <AssessmentCells
                row={row}
                canEditLaptop={canEditLaptop}
                onLaptop={(candidateId, laptopStatus) =>
                  setItems((current) => current.map((item) => (item.candidateId === candidateId ? { ...item, laptopStatus } : item)))
                }
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

function NameFilter({ name, names }: { name: string; names: string[] }) {
  const router = useRouter();
  return (
    <label className="mb-3 flex items-center gap-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Account</span>
      <select
        className="h-9 min-w-48 rounded-md border border-line bg-surface px-2"
        value={name}
        aria-label="Filter by account name"
        onChange={(event) => {
          const params = new URLSearchParams(window.location.search);
          params.delete("notice");
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

function applyNotification(rows: Assessment[], notification: AssessmentNotification) {
  return rows.map((row) => {
    if (row.id !== notification.id) return row;
    const updatedAt = new Date().toISOString();
    if (notification.event === "started") {
      return { ...row, status: "Started", stage: "", startTime: notification["started at"] || row.startTime, updatedAt };
    }
    if (notification.event === "updated") {
      return { ...row, status: "On Assessment", stage: notification.stage ?? "", stuck: false, stuckError: "", updatedAt };
    }
    if (notification.event === "stuck") {
      return { ...row, stuck: true, stuckError: notification.error ?? "", updatedAt };
    }
    return { ...row, status: "Waiting", stage: "", endTime: notification["ended at"] || row.endTime, stuck: false, stuckError: "", updatedAt };
  });
}
