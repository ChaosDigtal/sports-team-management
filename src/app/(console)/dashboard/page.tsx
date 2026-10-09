import Link from "next/link";
import { AllTimeLeaderboard, WeekLeaderboard } from "@/components/leaderboards";
import { RefreshEstimateButton } from "@/components/refresh-estimate";
import { PageHeader } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatHours, formatMoney } from "@/lib/format";
import { countActiveAccounts } from "@/lib/queries";
import { allScope, leaderboards, readProfitEstimate, summarize, userScope } from "@/lib/stats";
import { one } from "@/lib/utils";
import { refreshEstimatedProfit } from "@/server/actions";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Dashboard" };

const clickableCard = "metric-link block h-full min-w-0 rounded-lg border border-line px-4 py-3";

const WEEK_SORTS = ["rank", "user", "earnings", "hours"] as const;
const ALL_SORTS = ["rank", "user", "earnings", "profit", "hours", "gold", "silver", "bronze", "medals"] as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const manager = isManager(user);
  const params = await searchParams;
  const summary = summarize(manager ? allScope() : userScope(user.id));
  const accounts = countActiveAccounts(manager ? undefined : user.id);
  const boards = leaderboards();
  const estimate = user.isSuperAdmin ? readProfitEstimate() : null;
  const week = boards.week.map((row) => ({ ...row, earnings: manager ? row.earnings : null }));
  const allTime = boards.allTime.map((row) => ({
    ...row,
    earnings: manager ? row.earnings : null,
    profit: user.isSuperAdmin ? row.profit : null,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          manager
            ? "DA this week, Sunday through Saturday in Japan Standard Time."
            : "Your DA work this week, Sunday through Saturday in Japan Standard Time."
        }
      />
      <div className={user.isSuperAdmin ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-5" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}>
        {manager ? <Metric label="Earnings this week" value={formatMoney(summary.weekEarnings)} /> : null}
        <Metric label="Hours this week" value={formatHours(summary.weekHours)} hint={manager ? "All DA tasks" : "Your logged time"} />
        {user.isSuperAdmin ? (
          <div className="min-w-0 rounded-lg border border-line bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Estimated Profit This Week</div>
              <RefreshEstimateButton action={refreshEstimatedProfit} />
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{estimate ? formatMoney(estimate.amount) : "—"}</div>
            <div className="mt-1 text-xs text-muted">
              {estimate ? `Updated ${formatDateTime(estimate.calculatedAt)} JST` : "Refresh to calculate"}
            </div>
          </div>
        ) : null}
        <Metric label="Open tasks" value={String(summary.wip)} hint={manager ? "Status is WIP" : "Your WIP tasks"} href="/tasks?status=WIP" />
        <Metric label="Active accounts" value={String(accounts)} hint="Status is Active" href="/accounts?status=Active" />
      </div>
      <div className="mt-6 space-y-6">
        <WeekLeaderboard
          rows={week}
          showEarnings={manager}
          viewerId={user.id}
          canOpenProfiles={manager}
          sort={readSort(one(params.weekSort), WEEK_SORTS, manager ? "earnings" : "hours", manager)}
          dir={one(params.weekDir) === "asc" ? "asc" : "desc"}
          query={boardQuery(params)}
        />
        <AllTimeLeaderboard
          rows={allTime}
          showEarnings={manager}
          showProfit={user.isSuperAdmin}
          viewerId={user.id}
          canOpenProfiles={manager}
          sort={readSort(one(params.allSort), ALL_SORTS, "hours", manager, user.isSuperAdmin)}
          dir={one(params.allDir) === "asc" ? "asc" : "desc"}
          query={boardQuery(params)}
        />
      </div>
    </div>
  );
}

function readSort<T extends string>(value: string, allowed: readonly T[], fallback: T, showEarnings: boolean, showProfit = false) {
  if (!allowed.includes(value as T)) return fallback;
  if (value === "earnings" && !showEarnings) return fallback;
  if (value === "profit" && !showProfit) return fallback;
  return value as T;
}

function boardQuery(params: SearchParams) {
  return {
    weekSort: one(params.weekSort),
    weekDir: one(params.weekDir),
    allSort: one(params.allSort),
    allDir: one(params.allDir),
  };
}

function Metric({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </>
  );
  if (!href) return <div className="min-w-0 rounded-lg border border-line bg-white px-4 py-3">{body}</div>;
  return (
    <Link href={href} className={clickableCard}>
      {body}
    </Link>
  );
}
