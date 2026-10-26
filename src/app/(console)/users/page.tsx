import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleTags } from "@/components/role-tags";
import { EmptyRow, NoCell, NoHead, Notice, PageHeader, primaryBtn, secondaryBtn, tdClass, thClass, inputClass, labelClass } from "@/components/ui";
import { canManageUsers, isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatTimestamp } from "@/lib/format";
import { listUsers } from "@/lib/queries";
import { buildHref, cn, one } from "@/lib/utils";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  if (!isManager(user)) redirect(`/users/${user.id}`);
  const params = await searchParams;
  const q = one(params.q);
  const sort = one(params.sort) === "wip" ? "wip" : "name";
  const dir = one(params.dir) === "asc" ? "asc" : "desc";
  const users = listUsers({ q, sort, dir: sort === "wip" ? dir : "asc" });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Find people by name or login ID. Working accounts counts the accounts with a WIP task for that person."
        actions={
          canManageUsers(user) ? (
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
        <button className={secondaryBtn} type="submit">
          Search
        </button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-header">
            <tr>
              <NoHead />
              <th className={cn(thClass, "!text-center")}>Name</th>
              <th className={cn(thClass, "!text-center")}>Login ID</th>
              <th className={cn(thClass, "!text-center")}>Access</th>
              <th className={cn(thClass, "!text-center")}>Joined</th>
              <th className={cn(thClass, "!text-center")}>
                <Link href={buildHref("/users", { q, sort: "wip", dir: sort === "wip" && dir === "desc" ? "asc" : "desc" })} className="hover:text-ink">
                  Working accounts
                  {sort === "wip" ? (dir === "asc" ? " ↑" : " ↓") : ""}
                </Link>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.length === 0 ? <EmptyRow colSpan={6}>No one matches that search.</EmptyRow> : null}
            {users.map((person, index) => (
              <tr key={person.id} className="hover:bg-hover">
                <NoCell value={index + 1} />
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
                <td className={cn(tdClass, "!text-center tabular-nums")}>{person.wipAccountCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
