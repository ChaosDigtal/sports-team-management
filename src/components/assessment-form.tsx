"use client";

import Link from "next/link";
import { useState } from "react";
import { ASSESSMENT_STATUSES, assessmentLabel } from "@/lib/constants";
import type { Assessment } from "@/lib/types";
import { saveAssessment } from "@/server/actions";
import { hintClass, inputClass, labelClass, primaryBtn, secondaryBtn } from "./ui";

export function AssessmentForm({ assessment }: { assessment: Assessment }) {
  const [status, setStatus] = useState(assessment.status);
  const [stage, setStage] = useState(assessment.stage);
  const manualUpdate = (assessment.status === "Waiting" && status === "Passed") || (assessment.status === "Passed" && status === "Passed");
  const storedUpdate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(assessment.updatedAt) ? assessment.updatedAt : "";
  return (
    <form action={saveAssessment} className="max-w-3xl rounded-lg border border-line bg-surface p-5">
      <input type="hidden" name="id" value={assessment.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Start time</span>
          <input className={inputClass} name="startTime" type="datetime-local" defaultValue={assessment.startTime} />
        </label>
        <label>
          <span className={labelClass}>End time</span>
          <input className={inputClass} name="endTime" type="datetime-local" defaultValue={assessment.endTime} />
        </label>
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
          {assessment.status === "Waiting" && status === "Failed" ? (
            <span className={hintClass}>Update time is set to the current Japan time when you save.</span>
          ) : null}
        </label>
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
