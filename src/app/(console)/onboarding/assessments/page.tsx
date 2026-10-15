import { AssessmentsTable } from "@/components/assessments-table";
import { Notice, PageHeader } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listAssessments } from "@/lib/candidates";
import { one } from "@/lib/utils";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Assessments" };

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const manager = isManager(user);
  const params = await searchParams;
  const rows = listAssessments();

  return (
    <div>
      <PageHeader
        title="Assessments"
        description="A Ready row is added when a candidate becomes Active from Pending or Client No Longer Interested, and removed if they leave Active for Pending or Client No Longer Interested. Extension events update a row to Started, On Assessment - stage, or Waiting. A stuck row blinks a red border until the next update or end."
      />
      <Notice notice={one(params.notice)} />
      <AssessmentsTable rows={rows} canEdit={manager} />
    </div>
  );
}
