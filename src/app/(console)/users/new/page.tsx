import { UserForm } from "@/components/user-form";
import { AccessNote, PageHeader } from "@/components/ui";
import { canManageUsers } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { saveUser } from "@/server/actions";

export const metadata = { title: "New user" };

export default async function NewUserPage() {
  const user = await requireUser();
  if (!canManageUsers(user)) {
    return <AccessNote title="Platform admins create logins" body="A platform admin creates and edits user accounts." />;
  }
  return (
    <div>
      <PageHeader title="New user" description="Choose a login ID and assign a DA role." />
      <UserForm action={saveUser} allowSuperAdmin={user.isSuperAdmin} />
    </div>
  );
}
