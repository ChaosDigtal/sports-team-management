"use client";

import Link from "next/link";
import { useState } from "react";
import { assessmentLabel, countryName } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { Assessment } from "@/lib/types";
import { Badge, assessmentTone } from "./ui";

export function AssessmentCells({ row }: { row: Assessment }) {
  return (
    <>
      <td className="px-4 py-3 text-center tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <Link
            href={`/onboarding/assessments/${row.id}`}
            className="font-semibold text-accent underline decoration-accent/50 decoration-2 underline-offset-2 hover:text-accent-ink"
          >
            {row.id}
          </Link>
          <CopyProfileButton row={row} />
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <Link href={`/onboarding/${row.candidateId}`} className="font-semibold text-accent underline decoration-accent/50 decoration-2 underline-offset-2">
          {row.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-center break-all">{row.email || "—"}</td>
      <td className="px-4 py-3 text-center break-all font-mono text-xs">{row.password || "—"}</td>
      <td className="px-4 py-3 text-center">{row.whatsapp || "—"}</td>
      <td className="px-4 py-3 text-center font-mono text-xs">{row.anydeskId || "—"}</td>
      <td className="px-4 py-3 text-center break-all font-mono text-xs">{row.anydeskPassword || "—"}</td>
      <td className="px-4 py-3 text-center tabular-nums">{showTime(row.startTime)}</td>
      <td className="px-4 py-3 text-center tabular-nums">{showTime(row.endTime)}</td>
      <td className="px-4 py-3 text-center tabular-nums">{formatDateTime(row.updatedAt)}</td>
      <td className="px-4 py-3 text-center font-mono text-xs">{row.taskId || "—"}</td>
      <td className="px-4 py-3 text-center">
        <Badge tone={assessmentTone(row.status)}>{assessmentLabel(row.status, row.stage)}</Badge>
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
          window.setTimeout(() => setCopied(false), 2500);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <TickIcon /> : <CopyIcon />}
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

function TickIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="8" y="8" width="11" height="11" rx="1.5" />
      <path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />
    </svg>
  );
}

function showTime(value: string) {
  return value ? value.replace("T", " ") : "—";
}
