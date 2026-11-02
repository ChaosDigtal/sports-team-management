"use client";

import Link from "next/link";
import { useState } from "react";
import { ASSESSMENT_STATUSES, assessmentLabel } from "@/lib/constants";
import type { Assessment } from "@/lib/types";
import { jstNowWall } from "@/lib/time";
import { saveAssessment, setAssessmentStatus } from "@/server/actions";
import { hintClass, inputClass, labelClass, primaryBtn, secondaryBtn } from "./ui";

export function AssessmentForm({
  assessment,
  canEditWrittenBy = false,
  writtenByChoices = [],
}: {
  assessment: Assessment;
  canEditWrittenBy?: boolean;
  writtenByChoices?: string[];
}) {
  const [status, setStatus] = useState(assessment.status);
  const [stage, setStage] = useState(assessment.stage);
  const [startTime, setStartTime] = useState(assessment.startTime);
  const [endTime, setEndTime] = useState(assessment.endTime);
  const manualUpdate = (assessment.status === "Waiting" && status === "Passed") || (assessment.status === "Passed" && status === "Passed");
  const storedUpdate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(assessment.updatedAt) ? assessment.updatedAt : "";
  return (
    <form action={saveAssessment} className="max-w-3xl rounded-lg border border-line bg-surface p-5">
      <input type="hidden" name="id" value={assessment.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TimeField
          label="Start time"
          name="startTime"
          value={startTime}
          onChange={setStartTime}
          required={status === "On Assessment"}
          hint={status === "On Assessment" ? "Required for On Assessment. Japan time." : undefined}
        />
        <TimeField
          label="End time"
          name="endTime"
          value={endTime}
          onChange={setEndTime}
          required={status === "Waiting"}
          hint={status === "Waiting" ? "Required for Waiting. Japan time." : undefined}
        />
        <label>
          <span className={labelClass}>Task ID</span>
          <input className={inputClass} name="taskId" defaultValue={assessment.taskId} />
        </label>
        <label>
          <span className={labelClass}>Status</span>
          <span className="flex gap-2">
            <select className={inputClass} name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
              {ASSESSMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {status === "On Assessment" ? (
              <input className={inputClass} name="stage" value={stage} placeholder="Stage" aria-label="Stage" onChange={(event) => setStage(event.target.value)} />
            ) : (
              <input type="hidden" name="stage" value="" />
            )}
          </span>
          {status === "On Assessment" ? <span className={hintClass}>{assessmentLabel(status, stage)}</span> : null}
          {canEditWrittenBy ? null : <span className={hintClass}>Written by {assessment.writtenBy || "—"}</span>}
          {assessment.status === "Waiting" && status === "Failed" ? (
            <span className={hintClass}>Update time is set to the current Japan time when you save.</span>
          ) : null}
        </label>
        {canEditWrittenBy ? (
          <label>
            <span className={labelClass}>Written by</span>
            <select className={inputClass} name="writtenBy" defaultValue={assessment.writtenBy}>
              <option value="">—</option>
              {writtenByChoices.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {assessment.writtenBy && !writtenByChoices.includes(assessment.writtenBy) ? (
                <option value={assessment.writtenBy}>{assessment.writtenBy}</option>
              ) : null}
            </select>
          </label>
        ) : null}
        {manualUpdate ? (
          <label>
            <span className={labelClass}>Update time</span>
            <input className={inputClass} name="updatedAt" type="datetime-local" required defaultValue={assessment.status === "Passed" ? storedUpdate : ""} />
            <span className={hintClass}>Required when Waiting changes to Passed. Enter it in Japan time.</span>
          </label>
        ) : null}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Link href="/onboarding/assessments" className={secondaryBtn}>
          Cancel
        </Link>
        <button className={primaryBtn} type="submit">
          Save assessment
        </button>
      </div>
    </form>
  );
}

export function AssessmentStatusForm({ assessment }: { assessment: Assessment }) {
  const [status, setStatus] = useState(assessment.status);
  const [stage, setStage] = useState(assessment.stage);
  const [startTime, setStartTime] = useState(assessment.startTime);
  const [endTime, setEndTime] = useState(assessment.endTime);
  const manualUpdate = (assessment.status === "Waiting" && status === "Passed") || (assessment.status === "Passed" && status === "Passed");
  const storedUpdate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(assessment.updatedAt) ? assessment.updatedAt : "";
  return (
    <form action={setAssessmentStatus} className="mt-5 grid max-w-xl gap-4 border-t border-line pt-5">
      <input type="hidden" name="id" value={assessment.id} />
      <input type="hidden" name="returnTo" value={`/onboarding/assessments/${assessment.id}`} />
      <label>
        <span className={labelClass}>Status</span>
        <span className="flex gap-2">
          <select className={inputClass} name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {ASSESSMENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {status === "On Assessment" ? (
            <input className={inputClass} name="stage" value={stage} placeholder="Stage" aria-label="Stage" onChange={(event) => setStage(event.target.value)} />
          ) : (
            <input type="hidden" name="stage" value="" />
          )}
        </span>
        {status === "On Assessment" ? <span className={hintClass}>{assessmentLabel(status, stage)}</span> : null}
        {assessment.status === "Waiting" && status === "Failed" ? (
          <span className={hintClass}>Update time is set to the current Japan time when you save.</span>
        ) : null}
      </label>
      {status === "On Assessment" ? (
        <TimeField
          label="Start time"
          name="startTime"
          value={startTime}
          onChange={setStartTime}
          required
          hint="Required for On Assessment. Japan time."
        />
      ) : null}
      {status === "Waiting" ? (
        <TimeField
          label="End time"
          name="endTime"
          value={endTime}
          onChange={setEndTime}
          required
          hint="Required for Waiting. Japan time."
        />
      ) : null}
      {manualUpdate ? (
        <label>
          <span className={labelClass}>Update time</span>
          <input className={inputClass} name="updatedAt" type="datetime-local" required defaultValue={assessment.status === "Passed" ? storedUpdate : ""} />
          <span className={hintClass}>Required when Waiting changes to Passed. Enter it in Japan time.</span>
        </label>
      ) : null}
      <div>
        <button className={primaryBtn} type="submit">
          Save status
        </button>
      </div>
    </form>
  );
}

function TimeField({
  label,
  name,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <input className={inputClass} name={name} type="datetime-local" value={value} required={required} onChange={(event) => onChange(event.target.value)} />
        </div>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center rounded-md border border-line bg-surface px-2 text-xs font-medium hover:bg-canvas"
          onClick={() => onChange(jstNowWall())}
        >
          Use current date time
        </button>
      </div>
      {hint ? <span className={hintClass}>{hint}</span> : null}
    </label>
  );
}
