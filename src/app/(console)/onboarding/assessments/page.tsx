import Link from "next/link";
import { AssessmentsTable } from "@/components/assessments-table";
import { Notice, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listAssessments } from "@/lib/candidates";
import { buildHref, cn, one } from "@/lib/utils";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Assessments" };

const FILTERS = ["Failed", "Ready", "Passed", "Stuck", "On Assessment", "Waiting"] as const;

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const params = await searchParams;
  const status = FILTERS.includes(one(params.status) as (typeof FILTERS)[number]) ? one(params.status) : "";
  const name = one(params.name);
  const rows = listAssessments();

  return (
    <div>
      <PageHeader
        title="Assessments"
        description="A Ready row is added when a candidate becomes Active from Pending or Client No Longer Interested, and removed if they leave Active for Pending or Client No Longer Interested. Extension events update a row to Started, On Assessment (stage), or Waiting. Open an ID to edit times and status."
      />
      <Notice notice={one(params.notice)} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">Status</span>
        {[{ id: "", label: "All" }, ...FILTERS.map((item) => ({ id: item, label: item }))].map((option) => (
          <Link
            key={option.label}
            href={buildHref("/onboarding/assessments", { status: option.id, name })}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              status === option.id ? "bg-inverse text-inverse-ink" : "border border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {option.label}
          </Link>
        ))}
      </div>
      <AssessmentsTable rows={rows} filter={status} name={name} />
    </div>
  );
}
