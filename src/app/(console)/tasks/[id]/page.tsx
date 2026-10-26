import { notFound } from "next/navigation";
import { TaskForm } from "@/components/task-form";
import { AccessNote, Notice, PageHeader } from "@/components/ui";
import { isDaMember, isManager } from "@/lib/access";
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
  const member = !manager && isDaMember(user);
  const owns = task.createdBy === user.id;
  if (member && !owns) {
    return <AccessNote title="Created by someone else" body="You can open the tasks you created." />;
  }
  if (!manager && !member && task.userId !== user.id) {
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
        canChooseWork={manager || owns}
        assigneeName={user.name}
        onDelete={manager || owns ? removeTask.bind(null, task.id) : undefined}
      />
    </div>
  );
}
