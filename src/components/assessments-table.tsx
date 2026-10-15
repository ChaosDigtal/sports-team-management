"use client";

import { useEffect, useState } from "react";
import { AssessmentCells } from "@/components/assessment-row";
import { EmptyRow, thClass } from "@/components/ui";
import type { Assessment, AssessmentNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

const columns = ["ID", "Name", "WhatsApp", "AnyDesk ID", "AnyDesk password", "Start time", "End time", "Task ID", "Status"];

export function AssessmentsTable({ rows, canEdit }: { rows: Assessment[]; canEdit: boolean }) {
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

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-header">
          <tr>
            {columns.map((column) => (
              <th key={column} className={cn(thClass, "!text-center")}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.length === 0 ? <EmptyRow colSpan={columns.length}>No assessments yet.</EmptyRow> : null}
          {items.map((row) => (
            <tr key={row.id} className={cn("hover:bg-hover", row.stuck && "assessment-stuck")} title={row.stuck ? row.stuckError : undefined}>
              <AssessmentCells row={row} canEdit={canEdit} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function applyNotification(rows: Assessment[], notification: AssessmentNotification) {
  return rows.map((row) => {
    if (row.id !== notification.id) return row;
    if (notification.event === "started") {
      return { ...row, status: "Started", stage: "", startTime: notification["started at"] || row.startTime };
    }
    if (notification.event === "updated") {
      return { ...row, status: "On Assessment", stage: notification.stage ?? "", stuck: false, stuckError: "" };
    }
    if (notification.event === "stuck") {
      return { ...row, stuck: true, stuckError: notification.error ?? "" };
    }
    return { ...row, status: "Waiting", stage: "", endTime: notification["ended at"] || row.endTime, stuck: false, stuckError: "" };
  });
}
