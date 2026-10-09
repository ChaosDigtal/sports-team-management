import { AccountForm } from "@/components/account-form";
import { AccessNote, PageHeader } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { saveAccount } from "@/server/actions";

export const metadata = { title: "New account" };

export default async function NewAccountPage() {
  const user = await requireUser();
  if (!isManager(user)) {
    return <AccessNote title="Accounts are managed by platform admins" body="You can open accounts that already appear on your tasks." />;
  }
  return (
    <div>
      <PageHeader title="New account" description="A DA worker account, including remote access and profile details." />
      <AccountForm action={saveAccount} />
    </div>
  );
}
