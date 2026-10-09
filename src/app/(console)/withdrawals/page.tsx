import Link from "next/link";
import { redirect } from "next/navigation";
import { EntityTag } from "@/components/entity-tag";
import { FilterSelect } from "@/components/filter-select";
import { WithdrawalStatusSelect } from "@/components/withdrawal-status";
import { EmptyRow, inputClass, labelClass, Notice, PageHeader, secondaryBtn, tdClass, thClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { WITHDRAWAL_STATUSES } from "@/lib/constants";
import { formatDateTime, formatMoney, teamShare } from "@/lib/format";
import { listAccountOptions, listWithdrawals, withdrawalProfitTotals } from "@/lib/queries";
import { buildHref, cn, one } from "@/lib/utils";
import type { SearchParams, WithdrawalStatus } from "@/lib/types";

export const metadata = { title: "Withdrawals" };

export default async function WithdrawalsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/dashboard");
  const params = await searchParams;
  const accountId = one(params.account);
  const status = WITHDRAWAL_STATUSES.includes(one(params.status) as WithdrawalStatus) ? one(params.status) : "";
  const from = one(params.from);
  const to = one(params.to);
  const rows = listWithdrawals({
    accountId: accountId || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const totals = withdrawalProfitTotals({ accountId: accountId || undefined, from: from || undefined, to: to || undefined });
  const accounts = listAccountOptions();
  const returnTo = buildHref("/withdrawals", { account: accountId, status, from, to });

  return (
    <div>
      <PageHeader title="Withdrawals" description="Money withdrawn from an account after completed work has cleared the 7-day wait. Profit is the amount times that account's share." />
      <Notice notice={one(params.notice)} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SummaryCard label="Total paid" value={formatMoney(totals.paid)} />
        <SummaryCard label="Processing" value={formatMoney(totals.processing)} />
      </div>
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label>
          <span className={labelClass}>Account</span>
          <FilterSelect name="account" defaultValue={accountId} className={cn(inputClass, "min-w-48")}>
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </FilterSelect>
        </label>
        <label>
          <span className={labelClass}>From</span>
          <input className={inputClass} type="date" name="from" defaultValue={from} />
        </label>
        <label>
          <span className={labelClass}>To</span>
          <input className={inputClass} type="date" name="to" defaultValue={to} />
        </label>
        <label>
          <span className={labelClass}>Status</span>
          <FilterSelect name="status" defaultValue={status} className={cn(inputClass, "min-w-40")}>
            <option value="">All</option>
            {WITHDRAWAL_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </FilterSelect>
        </label>
        <button className={secondaryBtn} type="submit">
          Apply
        </button>
        {accountId || status || from || to ? (
          <Link href="/withdrawals" className="text-sm text-muted hover:text-ink">
            Clear
          </Link>
        ) : null}
      </form>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#f6f8fa]">
            <tr>
              <th className={cn(thClass, "!text-center")}>ID</th>
              <th className={cn(thClass, "!text-center")}>Account</th>
              <th className={cn(thClass, "!text-center")}>Amount</th>
              <th className={cn(thClass, "!text-center")}>Withdraw date time</th>
              <th className={cn(thClass, "!text-center")}>Share %</th>
              <th className={cn(thClass, "!text-center")}>Profit</th>
              <th className={cn(thClass, "!text-center")}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? <EmptyRow colSpan={7}>No withdrawals match.</EmptyRow> : null}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#f7faf9]">
                <td className={cn(tdClass, "!text-center font-mono text-xs")}>{row.id}</td>
                <td className={cn(tdClass, "!text-center")}>
                  <Link href={`/accounts/${row.accountId}`}>
                    <EntityTag id={row.accountId} name={row.accountName} kind="account" />
                  </Link>
                </td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{formatMoney(row.amount)}</td>
                <td className={cn(tdClass, "!text-center")}>{formatDateTime(row.withdrawnAt)}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{teamShare(row.sharePercent)}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{formatMoney(row.profit)}</td>
                <td className={cn(tdClass, "!text-center")}>
                  <WithdrawalStatusSelect id={row.id} status={row.status} returnTo={returnTo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-40 rounded-lg border border-line bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
