import Link from "next/link";
import { TasksTable } from "@/components/tasks-table";
import { FilterSelect } from "@/components/filter-select";
import { Notice, PageHeader, primaryBtn, secondaryBtn, inputClass, labelClass } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { TASK_STATUSES } from "@/lib/constants";
import { listAccountOptions, listPeopleOptions, listProjectOptions, listTasks } from "@/lib/queries";
import { buildHref, cn, one } from "@/lib/utils";
import type { SearchParams, TaskStatus } from "@/lib/types";

export const metadata = { title: "Tasks" };

const TASK_SORTS = ["id", "started", "ended", "earnings", "rate"] as const;

export default async function TasksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const manager = isManager(user);
  const params = await searchParams;
  const accountId = one(params.account);
  const projectId = one(params.project);
  const status = TASK_STATUSES.includes(one(params.status) as TaskStatus) ? one(params.status) : "";
  const q = one(params.q);
  const personId = manager ? one(params.user) : user.id;
  const requestedSort = one(params.sort);
  const sort = TASK_SORTS.includes(requestedSort as (typeof TASK_SORTS)[number]) ? requestedSort : "started";
  const visibleSort = !manager && sort === "earnings" ? "started" : sort;
  const dir = one(params.dir) === "asc" ? "asc" : "desc";
  const tasks = listTasks({
    accountId: accountId || undefined,
    projectId: projectId || undefined,
    userId: personId || undefined,
    status: status || undefined,
    q,
    sort: visibleSort as (typeof TASK_SORTS)[number],
    dir,
  });
  const accounts = listAccountOptions();
  const projects = listProjectOptions();
  const people = listPeopleOptions();
  const filters = {
    account: accountId,
    project: projectId,
    user: manager ? personId : "",
    q,
    status,
    sort: visibleSort,
    dir,
  };

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={manager ? "Work logged on DA accounts." : "Your DA tasks. Update times, logged time, and status as you go."}
        actions={
          manager ? (
            <Link href="/tasks/new" className={primaryBtn}>
              New task
            </Link>
          ) : null
        }
      />
      <Notice notice={one(params.notice)} />
      <div className="mb-4 flex flex-wrap gap-2">
        {["", ...TASK_STATUSES].map((item) => {
          const active = status === item;
          const label = item || "All";
          return (
            <Link
              key={label}
              href={buildHref("/tasks", { ...filters, status: item })}
              className={cn(
                "rounded-full px-3 py-1 text-sm",
                active ? "bg-ink text-white" : "border border-line bg-white text-muted hover:text-ink",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input type="hidden" name="sort" value={visibleSort} />
        <input type="hidden" name="dir" value={dir} />
        <label>
          <span className={labelClass}>Search</span>
          <input className={cn(inputClass, "min-w-52")} name="q" defaultValue={q} placeholder="ID, name, project" />
        </label>
        <label>
          <span className={labelClass}>Account</span>
          <FilterSelect name="account" defaultValue={accountId} className={cn(inputClass, "min-w-48")}>
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </FilterSelect>
        </label>
        <label>
          <span className={labelClass}>Project</span>
          <FilterSelect name="project" defaultValue={projectId} className={cn(inputClass, "min-w-48")}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </FilterSelect>
        </label>
        {manager ? (
          <label>
            <span className={labelClass}>Assignee</span>
            <FilterSelect name="user" defaultValue={personId} className={cn(inputClass, "min-w-48")}>
              <option value="">Everyone</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </FilterSelect>
          </label>
        ) : null}
        <button className={secondaryBtn} type="submit">
          Apply
        </button>
      </form>
      <TasksTable
        tasks={user.isSuperAdmin ? tasks : tasks.map((task) => ({ ...task, payoutStatus: "" }))}
        canSeeEarnings={manager}
        canSeePayout={user.isSuperAdmin}
        sort={visibleSort}
        dir={dir}
        filters={filters}
      />
    </div>
  );
}
