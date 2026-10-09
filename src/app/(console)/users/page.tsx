import Link from "next/link";
import { redirect } from "next/navigation";
import { FilterSelect } from "@/components/filter-select";
import { RoleTags } from "@/components/role-tags";
import { EmptyRow, Notice, PageHeader, primaryBtn, secondaryBtn, tdClass, thClass, inputClass, labelClass } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatTimestamp } from "@/lib/format";
import { listAccountOptions, listProjectOptions, listUsers } from "@/lib/queries";
import { cn, one } from "@/lib/utils";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  if (!isManager(user)) redirect(`/users/${user.id}`);
  const params = await searchParams;
  const q = one(params.q);
  const accountId = one(params.account);
  const projectId = one(params.project);
  const users = listUsers({ q, accountId, projectId });
  const accounts = listAccountOptions();
  const projects = listProjectOptions();

  return (
    <div>
      <PageHeader
        title="Users"
        description="Find people by name, login ID, the account they worked, or the project they worked. Super admins create logins."
        actions={
          user.isSuperAdmin ? (
            <Link href="/users/new" className={primaryBtn}>
              New user
            </Link>
          ) : null
        }
      />
      <Notice notice={one(params.notice)} />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label>
          <span className={labelClass}>Name or ID</span>
          <input className={cn(inputClass, "min-w-52")} name="q" defaultValue={q} />
        </label>
        <label>
          <span className={labelClass}>Account</span>
          <FilterSelect name="account" defaultValue={accountId} className={cn(inputClass, "min-w-48")}>
            <option value="">Any account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </FilterSelect>
        </label>
        <label>
          <span className={labelClass}>Project</span>
          <FilterSelect name="project" defaultValue={projectId} className={cn(inputClass, "min-w-48")}>
            <option value="">Any project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </FilterSelect>
        </label>
        <button className={secondaryBtn} type="submit">
          Search
        </button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#f6f8fa]">
            <tr>
              <th className={cn(thClass, "!text-center")}>Name</th>
              <th className={cn(thClass, "!text-center")}>Login ID</th>
              <th className={cn(thClass, "!text-center")}>Access</th>
              <th className={cn(thClass, "!text-center")}>Joined</th>
              <th className={cn(thClass, "!text-center")}>Accounts</th>
              <th className={cn(thClass, "!text-center")}>Projects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.length === 0 ? <EmptyRow colSpan={6}>No one matches that search.</EmptyRow> : null}
            {users.map((person) => (
              <tr key={person.id} className="hover:bg-[#f7faf9]">
                <td className={cn(tdClass, "!text-center")}>
                  <Link
                    href={`/users/${person.id}`}
                    className="font-semibold text-accent underline decoration-accent/50 decoration-2 underline-offset-2 hover:text-accent-ink hover:decoration-accent"
                  >
                    {person.name}
                  </Link>
                </td>
                <td className={cn(tdClass, "!text-center font-mono text-xs")}>{person.id}</td>
                <td className={cn(tdClass, "!text-center")}>
                  <RoleTags user={person} />
                </td>
                <td className={cn(tdClass, "!text-center")}>{formatTimestamp(person.signedUpAt)}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{person.accountCount}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{person.projectCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
