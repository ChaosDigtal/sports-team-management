"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TaskAlert } from "@/lib/task-alerts";

const STORAGE_KEY = "task-alert-seen";

export function TaskAlerts() {
  const [open, setOpen] = useState<TaskAlert[]>([]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    let stopped = false;
    async function check() {
      try {
        const response = await fetch("/api/task-alerts", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { alerts?: TaskAlert[] };
        const seen = new Set(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as string[]);
        const fresh = (payload.alerts ?? []).filter((alert) => !seen.has(alert.id));
        if (stopped || fresh.length === 0) return;
        const nextSeen = [...seen, ...fresh.map((alert) => alert.id)].slice(-200);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSeen));
        setOpen((current) => [...fresh, ...current].slice(0, 4));
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          for (const alert of fresh) new Notification(alert.title, { body: alert.body });
        }
      } catch {
        return;
      }
    }
    void check();
    const timer = window.setInterval(() => void check(), 20000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  if (open.length === 0) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
      <div className="w-full max-w-xl space-y-2">
        {open.map((alert) => (
          <div key={alert.id} className="rounded-lg border border-red-300 bg-white px-4 py-3 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="mt-1 text-sm text-muted">{alert.body}</p>
                <Link href={alert.href} className="mt-2 inline-block text-sm font-medium text-accent">
                  Open task
                </Link>
              </div>
              <button type="button" className="text-sm text-muted" onClick={() => setOpen((current) => current.filter((item) => item.id !== alert.id))}>
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
