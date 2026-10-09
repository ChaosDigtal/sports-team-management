import { notFound } from "next/navigation";
import { TaskForm } from "@/components/task-form";
import { AccessNote, Notice, PageHeader } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getTask, listAccountOptions, listPeopleOptions, listProjectOptions } from "@/lib/queries";
import { toDatetimeLocalValue } from "@/lib/time";
import { one } from "@/lib/utils";
import { removeTask, saveTask } from "@/server/actions";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Task" };

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const task = getTask(id);
  if (!task) notFound();
  const manager = isManager(user);
  if (!manager && task.userId !== user.id) {
    return <AccessNote title="Assigned to someone else" body="You can update the tasks on your own login." />;
  }
  const query = await searchParams;
  return (
    <div>
      <PageHeader title={task.id} description={`${task.accountName} · ${task.projectName} · ${task.userName}`} />
      <Notice notice={one(query.notice)} />
      <TaskForm
        action={saveTask}
        task={task}
        accounts={listAccountOptions()}
        projects={listProjectOptions()}
        people={listPeopleOptions()}
        startLocal={toDatetimeLocalValue(task.startTime, task.accountTimezone)}
        endLocal={toDatetimeLocalValue(task.endTime, task.accountTimezone)}
        canManage={manager}
        onDelete={manager ? removeTask.bind(null, task.id) : undefined}
      />
    </div>
  );
}
