import Link from "next/link";
import { CandidatesTable } from "@/components/candidates-table";
import { Notice, PageHeader, primaryBtn } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listCandidates } from "@/lib/candidates";
import { CANDIDATE_STATUSES, COUNTRIES } from "@/lib/constants";
import { buildHref, cn, one } from "@/lib/utils";
import type { Candidate, SearchParams } from "@/lib/types";

export const metadata = { title: "Candidates" };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const manager = isManager(user);
  const params = await searchParams;
  const q = one(params.q);
  const status = CANDIDATE_STATUSES.includes(one(params.status) as (typeof CANDIDATE_STATUSES)[number]) ? one(params.status) : "";
  const country = COUNTRIES.some((item) => item.id === one(params.country)) ? one(params.country) : "";
  const candidates = listCandidates({ status, country, q }).map((candidate) => (manager ? candidate : hideShare(candidate)));

  return (
    <div>
      <PageHeader
        title="Candidates"
        description="People being onboarded onto DA."
        actions={
          manager ? (
            <Link href="/onboarding/new" className={primaryBtn}>
              New candidate
            </Link>
          ) : null
        }
      />
      <Notice notice={one(params.notice)} />
      <CandidatesTable
        candidates={candidates}
        canSeeShare={manager}
        search={{ q, status, country }}
        filters={
          <>
            <FilterRow
              label="Status"
              current={status}
              param="status"
              q={q}
              country={country}
              status={status}
              options={[{ id: "", label: "All" }, ...CANDIDATE_STATUSES.map((item) => ({ id: item, label: item }))]}
            />
            <FilterRow
              label="Country"
              current={country}
              param="country"
              q={q}
              country={country}
              status={status}
              options={[{ id: "", label: "All" }, ...COUNTRIES.map((item) => ({ id: item.id, label: item.id }))]}
              flush
            />
          </>
        }
      />
    </div>
  );
}

function hideShare(candidate: Candidate): Candidate {
  return { ...candidate, sharingPercent: null };
}

function FilterRow({
  label,
  current,
  param,
  q,
  status,
  country,
  options,
  flush,
}: {
  label: string;
  current: string;
  param: "status" | "country";
  q: string;
  status: string;
  country: string;
  options: Array<{ id: string; label: string }>;
  flush?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", flush ? "" : "mb-2")}>
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {options.map((option) => {
        const active = current === option.id;
        const href = buildHref("/onboarding", {
          q,
          status: param === "status" ? option.id : status,
          country: param === "country" ? option.id : country,
        });
        return (
          <Link
            key={option.label}
            href={href}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              active ? "bg-inverse text-inverse-ink" : "border border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
