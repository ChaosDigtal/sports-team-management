"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ASSESSMENT_STATUSES, assessmentLabel, countryName } from "@/lib/constants";
import type { Assessment } from "@/lib/types";
import { saveAssessment } from "@/server/actions";
import { SecretText } from "./secret-fields";
import { Badge, assessmentTone } from "./ui";

export function AssessmentCells({ row, canEdit }: { row: Assessment; canEdit: boolean }) {
  const [status, setStatus] = useState(row.status);
  const formId = `assessment-${row.id}`;

  useEffect(() => {
    setStatus(row.status);
  }, [row.status]);

  if (!canEdit) {
    return (
      <>
        <td className="px-4 py-3 text-center tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            {row.id}
            <CopyProfileButton row={row} />
          </span>
        </td>
        <NameCell row={row} />
        <td className="px-4 py-3 text-center">{row.whatsapp || "—"}</td>
        <td className="px-4 py-3 text-center font-mono text-xs">{row.anydeskId || "—"}</td>
        <td className="px-4 py-3 text-center">
          <SecretText value={row.anydeskPassword} />
        </td>
        <td className="px-4 py-3 text-center tabular-nums">{showTime(row.startTime)}</td>
        <td className="px-4 py-3 text-center tabular-nums">{showTime(row.endTime)}</td>
        <td className="px-4 py-3 text-center font-mono text-xs">{row.taskId || "—"}</td>
        <td className="px-4 py-3 text-center">
          <Badge tone={assessmentTone(row.status)}>{assessmentLabel(row.status, row.stage)}</Badge>
        </td>
      </>
    );
  }

  return (
    <>
      <td className="px-4 py-3 text-center tabular-nums">
        <form id={formId} action={saveAssessment} />
        <input form={formId} type="hidden" name="id" value={row.id} />
        <span className="inline-flex items-center gap-1.5">
          {row.id}
          <CopyProfileButton row={row} />
        </span>
      </td>
      <NameCell row={row} />
      <td className="px-4 py-3 text-center">{row.whatsapp || "—"}</td>
      <td className="px-4 py-3 text-center font-mono text-xs">{row.anydeskId || "—"}</td>
      <td className="px-4 py-3 text-center">
        <SecretText value={row.anydeskPassword} />
      </td>
      <td className="px-2 py-2">
        <input
          key={row.startTime}
          form={formId}
          name="startTime"
          type="datetime-local"
          defaultValue={row.startTime}
          aria-label={`Start time for ${row.id}`}
          className={fieldClass}
          onBlur={(event) => event.currentTarget.form?.requestSubmit()}
        />
      </td>
      <td className="px-2 py-2">
        <input
          key={row.endTime}
          form={formId}
          name="endTime"
          type="datetime-local"
          defaultValue={row.endTime}
          aria-label={`End time for ${row.id}`}
          className={fieldClass}
          onBlur={(event) => event.currentTarget.form?.requestSubmit()}
        />
      </td>
      <td className="px-2 py-2">
        <input form={formId} name="taskId" defaultValue={row.taskId} aria-label={`Task ID for ${row.id}`} className={fieldClass} onBlur={(event) => event.currentTarget.form?.requestSubmit()} />
      </td>
      <td className="px-2 py-2 text-center">
        <select
          form={formId}
          name="status"
          value={status}
          aria-label={`Status for ${row.id}`}
          className={fieldClass}
          onChange={(event) => {
            setStatus(event.target.value);
            event.currentTarget.form?.requestSubmit();
          }}
        >
          {ASSESSMENT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {status === "On Assessment" ? (
          <input
            key={row.stage}
            form={formId}
            name="stage"
            defaultValue={row.stage}
            placeholder="Stage"
            aria-label={`Stage for ${row.id}`}
            className={`${fieldClass} mt-1`}
            onBlur={(event) => event.currentTarget.form?.requestSubmit()}
          />
        ) : (
          <input form={formId} type="hidden" name="stage" value="" />
        )}
      </td>
    </>
  );
}

function CopyProfileButton({ row }: { row: Assessment }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink"
      aria-label={copied ? "Copied profile" : `Copy profile for ${row.name}`}
      title={copied ? "Copied" : "Copy profile"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(profileLine(row));
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      <CopyIcon />
    </button>
  );
}

function profileLine(row: Assessment) {
  return `{${row.id}}{${row.name}}{${ageFromDob(row.dob)}}{${row.gender}}{${row.race}}{${countryName(row.country)}}{${row.linkedinUrl}}{${row.resumeUrl}}`;
}

function ageFromDob(dob: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "";
  const [year, month, day] = dob.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  const nowMonth = today.getMonth() + 1;
  if (nowMonth < month || (nowMonth === month && today.getDate() < day)) age -= 1;
  return age >= 0 ? String(age) : "";
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="8" y="8" width="11" height="11" rx="1.5" />
      <path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />
    </svg>
  );
}

function NameCell({ row }: { row: Assessment }) {
  return (
    <td className="px-4 py-3 text-center">
      <Link href={`/onboarding/${row.candidateId}`} className="font-semibold text-accent underline decoration-accent/50 decoration-2 underline-offset-2">
        {row.name}
      </Link>
    </td>
  );
}

const fieldClass = "h-8 w-full min-w-32 rounded-md border border-line bg-surface px-2 text-center text-sm";

function showTime(value: string) {
  return value ? value.replace("T", " ") : "—";
}
