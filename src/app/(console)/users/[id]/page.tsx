import { notFound } from "next/navigation";
import { RoleTags } from "@/components/role-tags";
import { UserForm } from "@/components/user-form";
import { AccessNote, Facts, Notice, PageHeader } from "@/components/ui";
import { canManageUsers, isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatTimestamp } from "@/lib/format";
import { countSuperAdmins, getSessionUser } from "@/lib/queries";
import { one } from "@/lib/utils";
import { removeUser, saveUser } from "@/server/actions";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "User" };

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireUser();
  const { id } = await params;
  const person = getSessionUser(id);
  if (!person) notFound();
  const manager = isManager(actor);
  if (!manager && actor.id !== person.id) {
    return <AccessNote title="Limited to your profile" body="Platform admins can browse the rest of the team." />;
  }
  const query = await searchParams;
  const superAdmin = canManageUsers(actor);

  return (
    <div>
      <PageHeader title={person.name} description={`${person.id} · Joined ${formatTimestamp(person.signedUpAt)}`} />
      <Notice notice={one(query.notice)} />
      {superAdmin ? (
        <UserForm
          action={saveUser}
          user={person}
          lockSuperAdmin={person.isSuperAdmin && countSuperAdmins() <= 1}
          onDelete={actor.id === person.id ? undefined : removeUser.bind(null, person.id)}
        />
      ) : (
        <div className="max-w-2xl rounded-lg border border-line bg-white p-5">
          <Facts
            items={[
              { label: "Login ID", value: <span className="font-mono">{person.id}</span> },
              { label: "Access", value: <RoleTags user={person} /> },
              { label: "Joined", value: formatTimestamp(person.signedUpAt) },
            ]}
          />
        </div>
      )}
    </div>
  );
}
