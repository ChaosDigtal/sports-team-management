import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentForm } from "@/components/assessment-form";
import { Badge, Facts, Notice, PageHeader, assessmentTone, blank, dangerBtn } from "@/components/ui";
import { canAccessOnboarding, isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getAssessment } from "@/lib/candidates";
import { assessmentLabel } from "@/lib/constants";
import { one } from "@/lib/utils";
import { failAssessment } from "@/server/actions";
import type { SearchParams } from "@/lib/types";

function showTime(value: string) {
  return value ? value.replace("T", " ") : "—";
}

export const metadata = { title: "Assessment" };

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const assessment = getAssessment(id);
  if (!assessment) notFound();
  const query = await searchParams;
  const manager = isManager(user);
  const canFail = canAccessOnboarding(user) && !manager && assessment.status === "Waiting";

  return (
    <div>
      <PageHeader
        title={`Assessment ${assessment.id}`}
        description={`${assessment.name} · ${assessmentLabel(assessment.status, assessment.stage)}`}
      />
      <Notice notice={one(query.notice)} />
      <section className="mb-6 max-w-3xl rounded-lg border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Candidate</h2>
          <Badge tone={assessmentTone(assessment.status)}>{assessmentLabel(assessment.status, assessment.stage)}</Badge>
        </div>
        <Facts
          items={[
            { label: "Name", value: <Link href={`/onboarding/${assessment.candidateId}`} className="text-accent underline">{assessment.name}</Link> },
            { label: "Email", value: blank(assessment.email) },
            { label: "Password", value: blank(assessment.password) },
            { label: "WhatsApp", value: blank(assessment.whatsapp) },
            { label: "AnyDesk ID", value: blank(assessment.anydeskId) },
            { label: "AnyDesk password", value: blank(assessment.anydeskPassword) },
          ]}
        />
      </section>
      {manager ? (
        <AssessmentForm assessment={assessment} />
      ) : (
        <section className="max-w-3xl rounded-lg border border-line bg-surface p-5">
          <Facts
            items={[
              { label: "Start time", value: showTime(assessment.startTime) },
              { label: "End time", value: showTime(assessment.endTime) },
              { label: "Task ID", value: blank(assessment.taskId) },
              { label: "Status", value: assessmentLabel(assessment.status, assessment.stage) },
            ]}
          />
        {canFail ? (
          <form action={failAssessment} className="mt-5 flex justify-end">
            <input type="hidden" name="id" value={assessment.id} />
            <button className={dangerBtn} type="submit">
              Mark as Failed
            </button>
          </form>
        ) : null}
      </section>
      )}
    </div>
  );
}
