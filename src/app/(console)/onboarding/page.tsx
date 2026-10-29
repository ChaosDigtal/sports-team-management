import Link from "next/link";
import { CandidatesTable } from "@/components/candidates-table";
import { Notice, PageHeader, primaryBtn } from "@/components/ui";
import { canEditLaptopStatus, isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listCandidates } from "@/lib/candidates";
import { CANDIDATE_STATUSES, COUNTRIES, LAPTOP_STATUSES } from "@/lib/constants";
import { buildHref, cn, one } from "@/lib/utils";
import type { Candidate, SearchParams } from "@/lib/types";

export const metadata = { title: "Candidates" };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const manager = isManager(user);
  const systemAdmin = user.isSuperAdmin;
  const params = await searchParams;
  const q = one(params.q);
  const status = CANDIDATE_STATUSES.includes(one(params.status) as (typeof CANDIDATE_STATUSES)[number]) ? one(params.status) : "";
  const country = COUNTRIES.some((item) => item.id === one(params.country)) ? one(params.country) : "";
  const noResume = one(params.noResume) === "1";
  const noLinkedin = one(params.noLinkedin) === "1";
  const laptop = LAPTOP_STATUSES.includes(one(params.laptop) as (typeof LAPTOP_STATUSES)[number]) ? one(params.laptop) : "";
  const candidates = listCandidates({ status, country, noResume, noLinkedin, laptop }).map((candidate) => (systemAdmin ? candidate : hideShare(candidate)));

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
        canSeeShare={systemAdmin}
        canEditLaptop={canEditLaptopStatus(user)}
        search={{ q, status, country, noResume, noLinkedin, laptop }}
        filters={
          <>
            <FilterRow
              label="Status"
              current={status}
              param="status"
              query={{ q, status, country, noResume, noLinkedin, laptop }}
              options={[{ id: "", label: "All" }, ...CANDIDATE_STATUSES.map((item) => ({ id: item, label: item }))]}
            />
            <FilterRow
              label="Country"
              current={country}
              param="country"
              query={{ q, status, country, noResume, noLinkedin, laptop }}
              options={[{ id: "", label: "All" }, ...COUNTRIES.map((item) => ({ id: item.id, label: item.id }))]}
            />
            <FilterRow
              label="Laptop status"
              current={laptop}
              param="laptop"
              query={{ q, status, country, noResume, noLinkedin, laptop }}
              options={[{ id: "", label: "All" }, ...LAPTOP_STATUSES.map((item) => ({ id: item, label: item }))]}
            />
            <ProfileFilters q={q} status={status} country={country} noResume={noResume} noLinkedin={noLinkedin} laptop={laptop} />
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
  query,
  options,
}: {
  label: string;
  current: string;
  param: "status" | "country" | "laptop";
  query: CandidateQuery;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {options.map((option) => {
        const active = current === option.id;
        const href = candidateHref({ ...query, [param]: option.id });
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

function ProfileFilters({ q, status, country, noResume, noLinkedin, laptop }: CandidateQuery) {
  const chips = [
    { key: "noResume" as const, label: "No Resume", active: noResume },
    { key: "noLinkedin" as const, label: "No LinkedIn", active: noLinkedin },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">Profile</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={candidateHref({ q, status, country, noResume, noLinkedin, laptop, [chip.key]: !chip.active })}
          className={cn(
            "rounded-full px-3 py-1 text-sm",
            chip.active ? "bg-inverse text-inverse-ink" : "border border-line bg-surface text-muted hover:text-ink",
          )}
        >
          {chip.label}
        </Link>
      ))}
    </div>
  );
}

type CandidateQuery = { q: string; status: string; country: string; noResume: boolean; noLinkedin: boolean; laptop: string };

function candidateHref(query: CandidateQuery) {
  return buildHref("/onboarding", {
    q: query.q,
    status: query.status,
    country: query.country,
    laptop: query.laptop,
    noResume: query.noResume ? "1" : "",
    noLinkedin: query.noLinkedin ? "1" : "",
  });
}
