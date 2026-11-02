"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { writeClipboard } from "@/components/copyable";
import { LaptopStatusSelect } from "@/components/laptop-status-select";
import { ASSESSMENT_STATUSES, assessmentLabel, countryName } from "@/lib/constants";
import type { Assessment, LaptopStatus } from "@/lib/types";
import { failAssessment, setAssessmentStatus } from "@/server/actions";
import { Badge, assessmentTone, personNameClass } from "./ui";

export function AssessmentCells({
  row,
  canEditLaptop,
  canEditStatus,
  canFailWaiting,
  onLaptop,
}: {
  row: Assessment;
  canEditLaptop: boolean;
  canEditStatus: boolean;
  canFailWaiting: boolean;
  onLaptop: (candidateId: string, laptopStatus: LaptopStatus) => void;
}) {
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
        <Link href={`/onboarding/${row.candidateId}`} className={personNameClass(row.candidateStatus === "Active")}>
          {row.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-center">
        <ReferralLinkCell link={row.referralLink} />
      </td>
      <td className="px-4 py-3 text-center break-all">{row.email || "—"}</td>
      <td className="px-4 py-3 text-center break-all font-mono text-xs">{row.password || "—"}</td>
      <td className="px-4 py-3 text-center">{row.whatsapp || "—"}</td>
      <td className="px-4 py-3 text-center">
        <LaptopStatusSelect candidateId={row.candidateId} value={row.laptopStatus} disabled={!canEditLaptop} onChange={(laptopStatus) => onLaptop(row.candidateId, laptopStatus)} />
      </td>
      <td className="px-4 py-3 text-center">{row.emailForwarding ? "Yes" : "No"}</td>
      <td className="px-4 py-3 text-center font-mono text-xs">{row.anydeskId || "—"}</td>
      <td className="px-4 py-3 text-center break-all font-mono text-xs">{row.anydeskPassword || "—"}</td>
      <td className="px-4 py-3 text-center tabular-nums">{showTime(row.startTime)}</td>
      <td className="px-4 py-3 text-center tabular-nums">{showTime(row.endTime)}</td>
      <td className="px-4 py-3 text-center tabular-nums">{showUpdateTime(row.updatedAt)}</td>
      <td className="px-4 py-3 text-center font-mono text-xs">{row.ultraviewerId || "—"}</td>
      <td className="px-4 py-3 text-center break-all font-mono text-xs">{row.ultraviewerPassword || "—"}</td>
      <td className="px-4 py-3 text-center">{row.writtenBy || "—"}</td>
      <td className="px-4 py-3 text-center">
        {canEditStatus ? (
          <StatusEditor row={row} />
        ) : (
          <span className="inline-flex flex-col items-center gap-1.5">
            <Badge tone={assessmentTone(row.status)}>{assessmentLabel(row.status, row.stage)}</Badge>
            {canFailWaiting && row.status === "Waiting" ? (
              <form action={failAssessment}>
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="rounded-md border border-red-200 px-2 py-0.5 text-xs font-medium text-danger hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                >
                  Fail
                </button>
              </form>
            ) : null}
          </span>
        )}
      </td>
    </>
  );
}

function StatusEditor({ row }: { row: Assessment }) {
  const [status, setStatus] = useState(row.status);
  const [stage, setStage] = useState(row.stage);
  const [pending, startTransition] = useTransition();
  const source = `${row.status}|${row.stage}|${row.updatedAt}|${row.writtenBy}`;
  const [seen, setSeen] = useState(source);
  if (seen !== source) {
    setSeen(source);
    setStatus(row.status);
    setStage(row.stage);
  }
  const needsTime = row.status === "Waiting" && status === "Passed";
  const needsStage = status === "On Assessment";

  function submit(next: string, nextStage: string) {
    const data = new FormData();
    data.set("id", String(row.id));
    data.set("status", next);
    data.set("stage", next === "On Assessment" ? nextStage : "");
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    data.set("returnTo", `${url.pathname}${url.search}`);
    startTransition(() => {
      void setAssessmentStatus(data);
    });
  }

  return (
    <form
      action={setAssessmentStatus}
      className="inline-flex min-w-40 flex-col items-center gap-1.5"
      onSubmit={(event) => {
        const input = event.currentTarget.elements.namedItem("returnTo");
        if (input instanceof HTMLInputElement) {
          const url = new URL(window.location.href);
          url.searchParams.delete("notice");
          input.value = `${url.pathname}${url.search}`;
        }
      }}
    >
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="returnTo" value="/onboarding/assessments" />
      <select
        className="h-8 max-w-44 rounded-md border border-line bg-surface px-2 text-xs"
        name="status"
        value={status}
        aria-label={`Status for assessment ${row.id}`}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          setStatus(next);
          const extra = next === "On Assessment" || (row.status === "Waiting" && next === "Passed");
          if (!extra) submit(next, "");
        }}
      >
        {ASSESSMENT_STATUSES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {needsStage ? (
        <input
          className="h-8 w-full rounded-md border border-line bg-surface px-2 text-xs"
          name="stage"
          value={stage}
          placeholder="Stage"
          aria-label="Stage"
          onChange={(event) => setStage(event.target.value)}
        />
      ) : (
        <input type="hidden" name="stage" value="" />
      )}
      {needsTime ? (
        <input className="h-8 w-full rounded-md border border-line bg-surface px-2 text-xs" name="updatedAt" type="datetime-local" required aria-label="Update time" />
      ) : null}
      {needsStage || needsTime ? (
        <button type="submit" disabled={pending} className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-white hover:bg-accent-ink disabled:opacity-60">
          Save
        </button>
      ) : null}
    </form>
  );
}

function ReferralLinkCell({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex max-w-56 items-center justify-center gap-1.5">
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="truncate text-accent underline decoration-accent/40 underline-offset-2">
          {link}
        </a>
      ) : (
        <span>—</span>
      )}
      <button
        type="button"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={copied ? "Copied referral link" : "Copy referral link"}
        title={copied ? "Copied" : "Copy referral link"}
        disabled={!link}
        onClick={async () => {
          try {
            await writeClipboard(link);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? <TickIcon /> : <CopyIcon />}
      </button>
    </span>
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
          await writeClipboard(profileLine(row));
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

function showUpdateTime(value: string) {
  if (!value || /z$/i.test(value)) return "—";
  return value.replace("T", " ");
}
