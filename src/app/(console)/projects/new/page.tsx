import { ProjectForm } from "@/components/project-form";
import { AccessNote, PageHeader } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { saveProject } from "@/server/actions";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  const user = await requireUser();
  if (!isManager(user)) {
    return <AccessNote title="Projects are managed by platform admins" body="You can open projects that already appear on your tasks." />;
  }
  return (
    <div>
      <PageHeader title="New project" description="Deadline, expected hours, and whether the team plans to work it." />
      <ProjectForm action={saveProject} />
    </div>
  );
}
