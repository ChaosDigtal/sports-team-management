import { TaskForm } from "@/components/task-form";
import { AccessNote, PageHeader } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listAccountOptions, listPeopleOptions, listProjectOptions } from "@/lib/queries";
import { saveTask } from "@/server/actions";

export const metadata = { title: "New task" };

export default async function NewTaskPage() {
  const user = await requireUser();
  if (!isManager(user)) {
    return <AccessNote title="Platform admins create tasks" body="You can update the tasks already assigned to you." />;
  }
  return (
    <div>
      <PageHeader title="New task" description="Assign an account, a person, and a project. Earning is hours logged times the rate." />
      <TaskForm
        action={saveTask}
        accounts={listAccountOptions()}
        projects={listProjectOptions()}
        people={listPeopleOptions()}
        startLocal=""
        endLocal=""
        canManage
      />
    </div>
  );
}
