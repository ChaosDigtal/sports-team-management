"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PROJECT_KINDS } from "@/lib/constants";
import { durationParts } from "@/lib/format";
import type { ActionState, Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DeleteButton } from "./delete-button";
import { FormError, inputClass, labelClass, primaryBtn, secondaryBtn } from "./ui";

export function ProjectForm({
  action,
  project,
  onDelete,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  project?: Project;
  onDelete?: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [autoExpire, setAutoExpire] = useState(project?.autoExpireEnabled ?? false);
  const max = durationParts(project?.maxAllowedMinutes);
  const start = durationParts(project?.recommendedStartMinutes);
  const end = durationParts(project?.recommendedEndMinutes);
  return (
    <div className="max-w-2xl">
      <form id="project-form" action={formAction} className="rounded-lg border border-line bg-white p-5">
        <FormError message={state.error} />
        {project ? <input type="hidden" name="id" value={project.id} /> : null}
        {project ? (
          <p className="mb-5 text-sm text-muted">
            Project ID <span className="font-mono text-ink">{project.id}</span>
          </p>
        ) : null}
        <div className="grid gap-4">
          <label>
            <span className={labelClass}>Name</span>
            <input className={inputClass} name="name" defaultValue={project?.name} required />
          </label>
          <label>
            <span className={labelClass}>Type</span>
            <select className={inputClass} name="kind" defaultValue={project?.kind ?? "Project"}>
              {PROJECT_KINDS.map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
          </label>
          <div>
            <span className={labelClass}>Maximum Allowed Time</span>
            <DurationInputs hoursName="maxHours" minutesName="maxMinutes" hours={max.hours} minutes={max.minutes} />
          </div>
          <div>
            <span className={labelClass}>Recommended Log Time</span>
            <div className="flex flex-wrap items-center gap-3">
              <DurationInputs hoursName="recommendedStartHours" minutesName="recommendedStartMinutes" hours={start.hours} minutes={start.minutes} />
              <span className="text-sm text-muted">to</span>
              <DurationInputs hoursName="recommendedEndHours" minutesName="recommendedEndMinutes" hours={end.hours} minutes={end.minutes} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="checkbox"
              name="autoExpireEnabled"
              value="on"
              checked={autoExpire}
              onChange={(event) => setAutoExpire(event.target.checked)}
              className="size-4 accent-accent"
            />
            <fieldset disabled={!autoExpire} className="flex min-w-0 flex-wrap items-center gap-3 disabled:opacity-40">
              <span className="text-sm">Auto Expires After</span>
              <input
                className={cn(inputClass, "w-28")}
                name="autoExpireMinutes"
                type="number"
                min="0"
                step="1"
                defaultValue={project?.autoExpireMinutes ?? ""}
              />
              <span className="text-sm text-muted">(mins)</span>
            </fieldset>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="intendToWork" defaultChecked={project?.intendToWork} className="size-4 accent-accent" />
            Intend to work
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="canPause" defaultChecked={project?.canPause} className="size-4 accent-accent" />
            Can be paused
          </label>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {project && onDelete ? <DeleteButton action={onDelete} label="project" /> : <span />}
        <div className="ml-auto flex gap-2">
          <Link href="/projects" className={secondaryBtn}>
            Cancel
          </Link>
          <button className={primaryBtn} type="submit" form="project-form" disabled={pending}>
            {pending ? "Saving…" : project ? "Save project" : "Create project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DurationInputs({
  hoursName,
  minutesName,
  hours,
  minutes,
}: {
  hoursName: string;
  minutesName: string;
  hours: string;
  minutes: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input className={cn(inputClass, "w-24")} name={hoursName} type="number" min="0" step="1" defaultValue={hours} aria-label="Hours" />
      <span className="text-sm text-muted">h</span>
      <input className={cn(inputClass, "w-24")} name={minutesName} type="number" min="0" max="59" step="1" defaultValue={minutes} aria-label="Minutes" />
      <span className="text-sm text-muted">m</span>
    </div>
  );
}
