import Link from "next/link";
import { AssessmentsTable } from "@/components/assessments-table";
import { Notice, PageHeader } from "@/components/ui";
import { canEditLaptopStatus, isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { LAPTOP_STATUSES } from "@/lib/constants";
import { listAssessments } from "@/lib/candidates";
import { buildHref, cn, one } from "@/lib/utils";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Assessments" };

const FILTERS = ["Failed", "Ready", "Passed", "Stuck", "On Assessment", "Waiting"] as const;

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const params = await searchParams;
  const status = FILTERS.includes(one(params.status) as (typeof FILTERS)[number]) ? one(params.status) : "";
  const name = one(params.name);
  const laptop = LAPTOP_STATUSES.includes(one(params.laptop) as (typeof LAPTOP_STATUSES)[number]) ? one(params.laptop) : "";
  const rawPage = Number(one(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const rows = listAssessments();

  return (
    <div>
      <PageHeader
        title="Assessments"
        description="A Ready row is added when a candidate becomes Active from Incomplete, In Review, or Client No Longer Interested, and removed if they leave Active for one of those. Extension events update a row to Started, On Assessment (stage), or Waiting. Open an ID to edit times and status."
      />
      <Notice notice={one(params.notice)} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">Status</span>
        {[{ id: "", label: "All" }, ...FILTERS.map((item) => ({ id: item, label: item }))].map((option) => (
          <Link
            key={option.label}
            href={buildHref("/onboarding/assessments", { status: option.id, name, laptop })}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              status === option.id ? "bg-inverse text-inverse-ink" : "border border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {option.label}
          </Link>
        ))}
      </div>
      <AssessmentsTable rows={rows} filter={status} name={name} laptop={laptop} page={page} canEditLaptop={canEditLaptopStatus(user)} canFailWaiting={!isManager(user)} />
    </div>
  );
}
