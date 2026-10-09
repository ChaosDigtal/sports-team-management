import Link from "next/link";
import { EmptyRow, Notice, PageHeader, inputClass, primaryBtn, ProjectKindTag, secondaryBtn, tdClass, thClass, YesNo } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { PROJECT_KINDS } from "@/lib/constants";
import { formatDuration, formatDurationRange } from "@/lib/format";
import { listProjects } from "@/lib/queries";
import { buildHref, cn, one } from "@/lib/utils";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const manager = isManager(user);
  const params = await searchParams;
  const q = one(params.q);
  const kind = PROJECT_KINDS.includes(one(params.type) as (typeof PROJECT_KINDS)[number]) ? one(params.type) : "";
  const sort = one(params.sort) === "max" ? "max" : "name";
  const dir = one(params.dir) === "desc" ? "desc" : "asc";
  const projects = listProjects(manager ? undefined : user.id, { kind, q, sort, dir });

  return (
    <div>
      <PageHeader
        title="Projects"
        description={manager ? "DA projects." : "Projects on your tasks."}
        actions={
          manager ? (
            <Link href="/projects/new" className={primaryBtn}>
              New project
            </Link>
          ) : null
        }
      />
      <Notice notice={one(params.notice)} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">Type</span>
          {[{ id: "", label: "All" }, ...PROJECT_KINDS.map((item) => ({ id: item, label: item }))].map((option) => (
            <Link
              key={option.label}
              href={buildHref("/projects", { type: option.id, q, sort, dir })}
              className={cn(
                "rounded-full px-3 py-1 text-sm",
                kind === option.id ? "bg-ink text-white" : "border border-line bg-white text-muted hover:text-ink",
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
        <form method="get" className="ml-auto flex items-center gap-2">
          {kind ? <input type="hidden" name="type" value={kind} /> : null}
          {sort !== "name" || dir !== "asc" ? (
            <>
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="dir" value={dir} />
            </>
          ) : null}
          <div className="w-56">
            <input className={inputClass} name="q" defaultValue={q} placeholder="Project name" aria-label="Search projects" />
          </div>
          <button className={secondaryBtn} type="submit">
            Search
          </button>
        </form>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#f6f8fa]">
            <tr>
              <th className={cn(thClass, "!text-center")}>
                <SortLink label="Name" column="name" sort={sort} dir={dir} kind={kind} q={q} />
              </th>
              <th className={cn(thClass, "!text-center")}>Type</th>
              <th className={cn(thClass, "!text-center")}>
                <SortLink label="Maximum Allowed Time" column="max" sort={sort} dir={dir} kind={kind} q={q} />
              </th>
              <th className={cn(thClass, "!text-center")}>Recommended Log Time</th>
              <th className={cn(thClass, "!text-center")}>Auto Expires After</th>
              <th className={cn(thClass, "!text-center")}>Intend to work</th>
              <th className={cn(thClass, "!text-center")}>Can be paused</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {projects.length === 0 ? <EmptyRow colSpan={7}>No projects match.</EmptyRow> : null}
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-[#f7faf9]">
                <td className={cn(tdClass, "!text-center")}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-semibold text-accent underline decoration-accent/50 decoration-2 underline-offset-2 hover:text-accent-ink hover:decoration-accent"
                  >
                    {project.name}
                  </Link>
                  <div className="mt-0.5 font-mono text-xs text-muted">{project.id}</div>
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <ProjectKindTag kind={project.kind} />
                </td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{formatDuration(project.maxAllowedMinutes)}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>
                  {formatDurationRange(project.recommendedStartMinutes, project.recommendedEndMinutes)}
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <YesNo value={project.autoExpireEnabled} />
                  {project.autoExpireEnabled && project.autoExpireMinutes != null ? (
                    <div className="mt-1 text-xs text-muted">{project.autoExpireMinutes} mins</div>
                  ) : null}
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <YesNo value={project.intendToWork} />
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <YesNo value={project.canPause} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortLink({
  label,
  column,
  sort,
  dir,
  kind,
  q,
}: {
  label: string;
  column: "name" | "max";
  sort: "name" | "max";
  dir: "asc" | "desc";
  kind: string;
  q: string;
}) {
  const next = sort === column && dir === "asc" ? "desc" : "asc";
  const mark = sort === column ? (dir === "asc" ? " ↑" : " ↓") : "";
  return (
    <Link href={buildHref("/projects", { type: kind, q, sort: column, dir: next })} className="hover:text-ink">
      {label}
      {mark}
    </Link>
  );
}
