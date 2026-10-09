import Link from "next/link";
import { AccountsTable } from "@/components/accounts-table";
import { Notice, PageHeader, primaryBtn } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { ACCOUNT_STATUSES, COUNTRIES } from "@/lib/constants";
import { listAccounts } from "@/lib/queries";
import { buildHref, cn, one } from "@/lib/utils";
import type { AccountRow, SearchParams } from "@/lib/types";

export const metadata = { title: "Accounts" };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const manager = isManager(user);
  const params = await searchParams;
  const q = one(params.q);
  const status = ACCOUNT_STATUSES.includes(one(params.status) as (typeof ACCOUNT_STATUSES)[number]) ? one(params.status) : "";
  const country = COUNTRIES.some((item) => item.id === one(params.country)) ? one(params.country) : "";
  const accounts = listAccounts(manager ? undefined : user.id, { status, country, q });

  return (
    <div>
      <PageHeader
        title="Accounts"
        description={manager ? "DA client accounts." : "Accounts on your tasks."}
        actions={
          manager ? (
            <Link href="/accounts/new" className={primaryBtn}>
              New account
            </Link>
          ) : null
        }
      />
      <Notice notice={one(params.notice)} />
      <AccountsTable
        accounts={manager ? accounts : accounts.map(hideShare)}
        canSeeShare={manager}
        search={{ q, status, country }}
        filters={
          <>
            <FilterRow
              label="Status"
              current={status}
              param="status"
              q={q}
              country={country}
              status={status}
              options={[{ id: "", label: "All" }, ...ACCOUNT_STATUSES.map((item) => ({ id: item, label: item }))]}
            />
            <FilterRow
              label="Country"
              current={country}
              param="country"
              q={q}
              country={country}
              status={status}
              options={[{ id: "", label: "All" }, ...COUNTRIES.map((item) => ({ id: item.id, label: item.id }))]}
              flush
            />
          </>
        }
      />
    </div>
  );
}

function hideShare(account: AccountRow): AccountRow {
  return { ...account, sharingPercent: null };
}

function FilterRow({
  label,
  current,
  param,
  q,
  status,
  country,
  options,
  flush,
}: {
  label: string;
  current: string;
  param: "status" | "country";
  q: string;
  status: string;
  country: string;
  options: Array<{ id: string; label: string }>;
  flush?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", flush ? "" : "mb-2")}>
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {options.map((option) => {
        const active = current === option.id;
        const href = buildHref("/accounts", {
          q,
          status: param === "status" ? option.id : status,
          country: param === "country" ? option.id : country,
        });
        return (
          <Link
            key={option.label}
            href={href}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              active ? "bg-ink text-white" : "border border-line bg-white text-muted hover:text-ink",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
