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
      <PageHeader title="New task" description={manager ? "Assign an account, a person, and a project. Earning is hours logged times the rate." : "This task is assigned to you. You can update or delete it later."} />
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
