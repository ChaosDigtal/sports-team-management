import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/project-form";
import { AccessNote, Facts, Notice, PageHeader, ProjectKindTag, YesNo } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatDuration, formatDurationRange, formatHours, formatMoney } from "@/lib/format";
import { getProject, getProjectRecord, userWorksOnProject } from "@/lib/queries";
import { one } from "@/lib/utils";
import { removeProject, saveProject } from "@/server/actions";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Project" };

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const record = getProjectRecord(id);
  if (!record) notFound();
  const manager = isManager(user);
  if (!manager && !userWorksOnProject(user.id, id)) {
    return <AccessNote title="Outside your projects" body="This project is not on your logged tasks." />;
  }
  const project = getProject(id, manager ? undefined : user.id);
  const query = await searchParams;

  return (
    <div>
      <PageHeader
        title={record.name}
        description={
          project
            ? `${record.id} · ${formatHours(project.loggedHours)} logged · ${formatMoney(project.earnings)}`
            : record.id
        }
      />
      <Notice notice={one(query.notice)} />
      {manager ? (
        <ProjectForm action={saveProject} project={record} onDelete={removeProject.bind(null, record.id)} />
      ) : (
        <div className="max-w-2xl rounded-lg border border-line bg-white p-5">
          <Facts
            items={[
              { label: "Type", value: <ProjectKindTag kind={record.kind} /> },
              { label: "Maximum Allowed Time", value: formatDuration(record.maxAllowedMinutes) },
              { label: "Recommended Log Time", value: formatDurationRange(record.recommendedStartMinutes, record.recommendedEndMinutes) },
              { label: "Logged hours", value: formatHours(project?.loggedHours ?? 0) },
              { label: "Earnings", value: formatMoney(project?.earnings ?? 0) },
              {
                label: "Auto Expires After",
                value: record.autoExpireEnabled ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <YesNo value />
                    <span>{record.autoExpireMinutes ?? "—"} mins</span>
                  </span>
                ) : (
                  <YesNo value={false} />
                ),
              },
              { label: "Intend to work", value: <YesNo value={record.intendToWork} /> },
              { label: "Can be paused", value: <YesNo value={record.canPause} /> },
            ]}
          />
        </div>
      )}
    </div>
  );
}
