import { UserForm } from "@/components/user-form";
import { AccessNote, PageHeader } from "@/components/ui";
import { canManageUsers } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { saveUser } from "@/server/actions";

export const metadata = { title: "New user" };

export default async function NewUserPage() {
  const user = await requireUser();
  if (!canManageUsers(user)) {
    return <AccessNote title="Super admins create logins" body="Platform admins can review people, and a super admin assigns roles." />;
  }
  return (
    <div>
      <PageHeader title="New user" description="Choose a login ID and assign super admin, DA platform admin, or DA member." />
      <UserForm action={saveUser} />
    </div>
  );
}
