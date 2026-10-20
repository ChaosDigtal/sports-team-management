import { CandidateForm } from "@/components/candidate-form";
import { AccessNote, PageHeader } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { saveCandidate } from "@/server/actions";

export const metadata = { title: "New candidate" };

export default async function NewCandidatePage() {
  const user = await requireUser();
  if (!isManager(user)) {
    return <AccessNote title="Creating candidates is limited" body="You can edit candidate profiles from the list. A platform admin creates and deletes them." />;
  }
  return (
    <div>
      <PageHeader title="New candidate" description="A person being onboarded onto DA. Setting status to Active adds a Ready assessment." />
      <CandidateForm action={saveCandidate} showShare={user.isSuperAdmin} />
    </div>
  );
}
