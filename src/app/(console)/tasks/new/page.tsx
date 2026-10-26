import { TaskForm } from "@/components/task-form";
import { AccessNote, PageHeader } from "@/components/ui";
import { isDaMember, isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listAccountOptions, listPeopleOptions, listProjectOptions } from "@/lib/queries";
import { saveTask } from "@/server/actions";

export const metadata = { title: "New task" };

export default async function NewTaskPage() {
  const user = await requireUser();
  const manager = isManager(user);
  const member = !manager && isDaMember(user);
  if (!manager && !member) {
    return <AccessNote title="Platform admins create tasks" body="You can update the tasks already assigned to you." />;
  }
  return (
    <div>
      <PageHeader title="New task" description={manager ? "Account, assignee, project, start time, and hourly rate are required." : "This task is assigned to you. Account, project, start time, and hourly rate are required."} />
      <TaskForm
        action={saveTask}
        accounts={listAccountOptions()}
        projects={listProjectOptions()}
        people={listPeopleOptions()}
        startLocal=""
        endLocal=""
        canManage={manager}
        canChooseWork
        assigneeName={user.name}
      />
    </div>
  );
}
