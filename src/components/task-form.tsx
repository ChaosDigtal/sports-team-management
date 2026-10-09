"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { TASK_STATUSES } from "@/lib/constants";
import { computeEarning, durationParts, formatDuration, formatMoney } from "@/lib/format";
import { elapsedHours, formatAccountTime, isWorkingAccountTime, zonedLocalToUtc } from "@/lib/time";
import type { ActionState, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DeleteButton } from "./delete-button";
import { FormError, hintClass, inputClass, labelClass, primaryBtn, secondaryBtn } from "./ui";

type Option = { id: string; name: string; timezone?: string };

export function TaskForm({
  action,
  task,
  accounts,
  projects,
  people,
  startLocal,
  endLocal,
  canManage,
  onDelete,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  task?: Task;
  accounts: Option[];
  projects: Option[];
  people: Option[];
  startLocal: string;
  endLocal: string;
  canManage: boolean;
  onDelete?: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [accountId, setAccountId] = useState(task?.accountId ?? accounts[0]?.id ?? "");
  const [timezone, setTimezone] = useState(task?.accountTimezone ?? accounts[0]?.timezone ?? "UTC");
  const [start, setStart] = useState(startLocal);
  const [end, setEnd] = useState(endLocal);
  const loggedParts = durationParts(task?.loggedHours == null ? null : Math.round(task.loggedHours * 60));
  const [loggedHours, setLoggedHours] = useState(loggedParts.hours);
  const [loggedMinutes, setLoggedMinutes] = useState(loggedParts.minutes);
  const [rate, setRate] = useState(task?.rate ?? "");
  const [status, setStatus] = useState(task?.status ?? "WIP");

  const preview = useMemo(() => {
    let elapsed: number | null = null;
    try {
      if (start && end) {
        elapsed = elapsedHours(zonedLocalToUtc(start, timezone).toISOString(), zonedLocalToUtc(end, timezone).toISOString());
      }
    } catch {
      elapsed = null;
    }
    const blank = loggedHours === "" && loggedMinutes === "";
    const loggedNumber = blank ? null : Number(loggedHours || 0) + Number(loggedMinutes || 0) / 60;
    const rateNumber = rate === "" ? null : Number(rate);
    const earning =
      status === "Exited" || loggedNumber == null || rateNumber == null || !Number.isFinite(loggedNumber) || !Number.isFinite(rateNumber)
        ? null
        : computeEarning(loggedNumber, rateNumber);
    return { elapsed, earning };
  }, [start, end, timezone, loggedHours, loggedMinutes, rate, status]);

  return (
    <div className="max-w-3xl">
      <form id="task-form" action={formAction} className="rounded-lg border border-line bg-white p-5">
        <FormError message={state.error} />
        {task ? <input type="hidden" name="id" value={task.id} /> : null}
        {task ? (
          <p className="mb-5 text-sm text-muted">
            Task ID <span className="font-mono text-ink">{task.id}</span>
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {canManage ? (
            <label>
              <span className={labelClass}>Account</span>
              <select
                className={inputClass}
                name="accountId"
                value={accountId}
                onChange={(event) => {
                  const next = event.target.value;
                  setAccountId(next);
                  const account = accounts.find((item) => item.id === next);
                  setTimezone(account?.timezone ?? "UTC");
                }}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <ReadOnly label="Account" value={task?.accountName} />
          )}
          {canManage ? (
            <label>
              <span className={labelClass}>Assignee</span>
              <select className={inputClass} name="userId" defaultValue={task?.userId ?? people[0]?.id}>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <ReadOnly label="Assignee" value={task?.userName} />
          )}
          {canManage ? (
            <label>
              <span className={labelClass}>Project</span>
              <select className={inputClass} name="projectId" defaultValue={task?.projectId ?? projects[0]?.id}>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <ReadOnly label="Project" value={task?.projectName} />
          )}
          <AccountClock timeZone={timezone} />
          <label>
            <span className={labelClass}>Started (Local)</span>
            <input className={inputClass} name="startTime" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Ended (Local)</span>
            <input className={inputClass} name="endTime" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
          </label>
          <div>
            <span className={labelClass}>Time logged</span>
            <div className="flex items-center gap-2">
              <input
                className={inputClass}
                name="loggedHours"
                type="number"
                min="0"
                step="1"
                value={loggedHours}
                onChange={(event) => setLoggedHours(event.target.value)}
                aria-label="Logged hours"
              />
              <span className="text-sm text-muted">h</span>
              <input
                className={inputClass}
                name="loggedMinutes"
                type="number"
                min="0"
                max="59"
                step="1"
                value={loggedMinutes}
                onChange={(event) => setLoggedMinutes(event.target.value)}
                aria-label="Logged minutes"
              />
              <span className="text-sm text-muted">m</span>
            </div>
          </div>
          {canManage ? (
            <label>
              <span className={labelClass}>Hourly rate</span>
              <input
                className={inputClass}
                name="rate"
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
            </label>
          ) : (
            <ReadOnly label="Hourly rate" value={task?.rate == null ? "—" : formatMoney(task.rate)} />
          )}
          <label>
            <span className={labelClass}>Status</span>
            <select className={inputClass} name="status" value={status} onChange={(event) => setStatus(event.target.value as Task["status"])}>
              {TASK_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={cn("mt-5 grid gap-3 rounded-md bg-canvas px-4 py-3 text-sm", canManage ? "sm:grid-cols-2" : "")}>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Elapsed</div>
            <div className="mt-1 tabular-nums">{preview.elapsed == null ? "—" : formatDuration(Math.round(preview.elapsed * 60))}</div>
            <p className={hintClass}>Calculated from the start and end, in the account timezone.</p>
          </div>
          {canManage ? (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted">Earning</div>
              <div className="mt-1 tabular-nums">{formatMoney(preview.earning)}</div>
              <p className={hintClass}>Time logged multiplied by the hourly rate. Exited tasks are left out.</p>
            </div>
          ) : null}
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {task && onDelete ? <DeleteButton action={onDelete} label="task" /> : <span />}
        <div className="ml-auto flex gap-2">
          <Link href="/tasks" className={secondaryBtn}>
            Cancel
          </Link>
          <button className={primaryBtn} type="submit" form="task-form" disabled={pending}>
            {pending ? "Saving…" : task ? "Save task" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountClock({ timeZone }: { timeZone: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const outside = now != null && !isWorkingAccountTime(now, timeZone);
  return (
    <div>
      <div className={labelClass}>Account time</div>
      <div className={cn("flex h-10 items-center text-sm tabular-nums", outside && "font-semibold text-red-600")}>
        {now ? formatAccountTime(now, timeZone) : "—"}
      </div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className={labelClass}>{label}</div>
      <div className="flex h-10 items-center text-sm">{value || "—"}</div>
    </div>
  );
}
