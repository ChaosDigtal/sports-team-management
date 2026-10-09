import Link from "next/link";
import { FilterSelect } from "@/components/filter-select";
import { PeriodCharts } from "@/components/period-chart";
import { ShareTable } from "@/components/share-table";
import { inputClass, labelClass, Notice, PageHeader, Panel, primaryBtn, secondaryBtn } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatHours, formatMoney } from "@/lib/format";
import { listAccountOptions, listPeopleOptions, listProjectOptions } from "@/lib/queries";
import {
  accountScope,
  allScope,
  chartPoints,
  payoutSummary,
  projectScope,
  selectionTotals,
  statsByAccount,
  statsByProject,
  statsByUser,
  userScope,
  withRange,
  type StatDir,
  type StatSort,
} from "@/lib/stats";
import { addDaysToKey, weekStartKey } from "@/lib/time";
import { buildHref, cn, one } from "@/lib/utils";
import { withdrawAvailable } from "@/server/actions";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Statistics" };

const tabs = [
  { id: "account", label: "By account" },
  { id: "project", label: "By project" },
  { id: "user", label: "By user" },
] as const;

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const manager = isManager(user);
  const params = await searchParams;
  const requested = one(params.view);
  const view = !manager ? "user" : tabs.some((tab) => tab.id === requested) ? requested : "account";
  const accounts = listAccountOptions();
  const projects = listProjectOptions();
  const people = manager ? listPeopleOptions() : [{ id: user.id, name: user.name }];
  const accountParam = one(params.account);
  const allAccounts = accountParam === "all";
  const account = allAccounts ? null : (accounts.find((item) => item.id === accountParam) ?? accounts[0] ?? null);
  const project = projects.find((item) => item.id === one(params.project)) ?? projects[0];
  const person = people.find((item) => item.id === (manager ? one(params.user) : user.id)) ?? people[0];
  const userSort = readSort(one(params.userSort), manager);
  const userDir = readDir(one(params.userDir));
  const projectSort = readSort(one(params.projectSort), manager);
  const projectDir = readDir(one(params.projectDir));
  const accountSort = readSort(one(params.accountSort), manager);
  const accountDir = readDir(one(params.accountDir));
  const from = readDate(one(params.from));
  const to = readDate(one(params.to));

  return (
    <div>
      <PageHeader
        title="Statistics"
        description={
          manager
            ? "Tables cover all logged time. A percentage is that row's share of the selection. Charts use Japan Standard Time, and a task counts in the period it started."
            : "Your hours across accounts and projects. Charts use Japan Standard Time, and a task counts in the period it started."
        }
      />
      <Notice notice={one(params.notice)} />
      {manager ? (
        <nav className="mb-5 flex gap-1 border-b border-line">
          {tabs.map((tab) => {
            const active = view === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/statistics?view=${tab.id}`}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm",
                  active ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {view === "account" && (allAccounts || account) ? (
        <AccountView
          accountId={allAccounts ? "all" : account!.id}
          accountName={allAccounts ? "All accounts" : account!.name}
          accounts={accounts}
          manager={manager}
          superAdmin={user.isSuperAdmin}
          userSort={userSort}
          userDir={userDir}
          projectSort={projectSort}
          projectDir={projectDir}
          from={from}
          to={to}
        />
      ) : null}

      {view === "project" && project ? (
        <ProjectView
          projectId={project.id}
          projectName={project.name}
          projects={projects}
          manager={manager}
          accountSort={accountSort}
          accountDir={accountDir}
          userSort={userSort}
          userDir={userDir}
          from={from}
          to={to}
        />
      ) : null}

      {view === "user" && person ? (
        <UserView
          personId={person.id}
          personName={person.name}
          people={people}
          manager={manager}
          accountSort={accountSort}
          accountDir={accountDir}
          projectSort={projectSort}
          projectDir={projectDir}
          from={from}
          to={to}
        />
      ) : null}
      {(view === "account" && !allAccounts && !account) || (view === "project" && !project) || (view === "user" && !person) ? (
        <p className="text-sm text-muted">Nothing to report yet.</p>
      ) : null}
    </div>
  );
}

function AccountView({
  accountId,
  accountName,
  accounts,
  manager,
  superAdmin,
  userSort,
  userDir,
  projectSort,
  projectDir,
  from,
  to,
}: {
  accountId: string;
  accountName: string;
  accounts: Array<{ id: string; name: string }>;
  manager: boolean;
  superAdmin: boolean;
  userSort: StatSort;
  userDir: StatDir;
  projectSort: StatSort;
  projectDir: StatDir;
  from: string;
  to: string;
}) {
  const ranged = Boolean(from || to);
  const scope = withRange(accountId === "all" ? allScope() : accountScope(accountId), from, to);
  const payout = payoutSummary(accountId === "all" ? undefined : accountId);
  const totals = selectionTotals(scope);
  const points = safePoints(scope, manager);
  const query = { view: "account", account: accountId, userSort, userDir, projectSort, projectDir, from, to };
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="view" value="account" />
          <input type="hidden" name="userSort" value={userSort} />
          <input type="hidden" name="userDir" value={userDir} />
          <input type="hidden" name="projectSort" value={projectSort} />
          <input type="hidden" name="projectDir" value={projectDir} />
          <label>
            <span className={labelClass}>Account</span>
            <FilterSelect name="account" defaultValue={accountId} className={cn(inputClass, "min-w-64")}>
              <option value="all">All</option>
              {accounts.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </FilterSelect>
          </label>
          <DateRange from={from} to={to} preserve={{ view: "account", account: accountId, userSort, userDir, projectSort, projectDir }} />
        </form>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          {manager ? <StatCard label="Total earnings" value={formatMoney(ranged ? totals.earnings : payout.totalEarnings)} /> : null}
          {manager && !ranged ? <StatCard label="Available to withdraw" value={formatMoney(payout.available)} /> : null}
          {manager && !ranged ? <StatCard label="Pending approval" value={formatMoney(payout.pending)} /> : null}
          <StatCard label="Hours worked" value={formatHours(ranged ? totals.hours : payout.hours)} />
          {superAdmin && !ranged ? (
            <form action={withdrawAvailable}>
              <input type="hidden" name="accountId" value={accountId} />
              <button className={primaryBtn} type="submit" disabled={payout.available <= 0}>
                Withdraw
              </button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="grid gap-6">
        <ShareTable
          title="By user"
          caption={`People who logged time on ${accountName}.`}
          nameHeader="User"
          rows={statsByUser(scope, { sort: userSort, dir: userDir, last: "activity" })}
          showShare
          showEarnings={manager}
          tag="user"
          sort={userSort}
          dir={userDir}
          query={query}
          sortKey="userSort"
          dirKey="userDir"
        />
        <ShareTable
          title="By project"
          caption="Projects completed on this account, ranked here. Last worked at is the latest completion."
          nameHeader="Project"
          rows={statsByProject(scope, { sort: projectSort, dir: projectDir, last: "completed" })}
          showShare
          showEarnings={manager}
          tag="project"
          sort={projectSort}
          dir={projectDir}
          query={query}
          sortKey="projectSort"
          dirKey="projectDir"
        />
        <Panel title={manager ? "Earnings and hours" : "Hours worked"} caption="Drag the chart, or use the arrows. Left moves into earlier periods.">
          <PeriodCharts points={points} showEarnings={manager} />
        </Panel>
      </div>
    </div>
  );
}

function ProjectView({
  projectId,
  projectName,
  projects,
  manager,
  accountSort,
  accountDir,
  userSort,
  userDir,
  from,
  to,
}: {
  projectId: string;
  projectName: string;
  projects: Array<{ id: string; name: string }>;
  manager: boolean;
  accountSort: StatSort;
  accountDir: StatDir;
  userSort: StatSort;
  userDir: StatDir;
  from: string;
  to: string;
}) {
  const scope = withRange(projectScope(projectId), from, to);
  const totals = selectionTotals(scope);
  const query = { view: "project", project: projectId, accountSort, accountDir, userSort, userDir, from, to };
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="view" value="project" />
          <input type="hidden" name="accountSort" value={accountSort} />
          <input type="hidden" name="accountDir" value={accountDir} />
          <input type="hidden" name="userSort" value={userSort} />
          <input type="hidden" name="userDir" value={userDir} />
          <label>
            <span className={labelClass}>Project</span>
            <FilterSelect name="project" defaultValue={projectId} className={cn(inputClass, "min-w-64")}>
              {projects.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </FilterSelect>
          </label>
          <DateRange from={from} to={to} preserve={{ view: "project", project: projectId, accountSort, accountDir, userSort, userDir }} />
        </form>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          {manager ? <StatCard label="Total earnings" value={formatMoney(totals.earnings)} /> : null}
          <StatCard label="Total worked hours" value={formatHours(totals.hours)} />
        </div>
      </div>
      <div className="grid gap-6">
        <ShareTable
          title="By account"
          caption={`Accounts that logged time on ${projectName}.`}
          nameHeader="Account"
          rows={statsByAccount(scope, { sort: accountSort, dir: accountDir, last: "activity" })}
          showShare
          showEarnings={manager}
          tag="account"
          sort={accountSort}
          dir={accountDir}
          query={query}
          sortKey="accountSort"
          dirKey="accountDir"
        />
        <ShareTable
          title="By user"
          caption="People who logged time on this project."
          nameHeader="User"
          rows={statsByUser(scope, { sort: userSort, dir: userDir, last: "activity" })}
          showShare
          showEarnings={manager}
          tag="user"
          sort={userSort}
          dir={userDir}
          query={query}
          sortKey="userSort"
          dirKey="userDir"
        />
        <Panel title={manager ? "Earnings and hours" : "Hours worked"} caption="Drag the chart, or use the arrows. Left moves into earlier periods.">
          <PeriodCharts points={safePoints(scope, manager)} showEarnings={manager} />
        </Panel>
      </div>
    </div>
  );
}

function UserView({
  personId,
  personName,
  people,
  manager,
  accountSort,
  accountDir,
  projectSort,
  projectDir,
  from,
  to,
}: {
  personId: string;
  personName: string;
  people: Array<{ id: string; name: string }>;
  manager: boolean;
  accountSort: StatSort;
  accountDir: StatDir;
  projectSort: StatSort;
  projectDir: StatDir;
  from: string;
  to: string;
}) {
  const scope = withRange(userScope(personId), from, to);
  const totals = selectionTotals(scope);
  const query = { view: "user", user: personId, accountSort, accountDir, projectSort, projectDir, from, to };
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="view" value="user" />
          <input type="hidden" name="accountSort" value={accountSort} />
          <input type="hidden" name="accountDir" value={accountDir} />
          <input type="hidden" name="projectSort" value={projectSort} />
          <input type="hidden" name="projectDir" value={projectDir} />
          <label>
            <span className={labelClass}>User</span>
            <FilterSelect name="user" defaultValue={personId} className={cn(inputClass, "min-w-64")}>
              {people.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </FilterSelect>
          </label>
          <DateRange from={from} to={to} preserve={{ view: "user", user: personId, accountSort, accountDir, projectSort, projectDir }} />
        </form>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          {manager ? <StatCard label="Total earnings" value={formatMoney(totals.earnings)} /> : null}
          <StatCard label="Total hours worked" value={formatHours(totals.hours)} />
          {manager ? <StatCard label="Total profits" value={formatMoney(totals.profit)} /> : null}
        </div>
      </div>
      <div className="grid gap-6">
        <ShareTable
          title="By account"
          caption={`Accounts ${personName} logged time on.`}
          nameHeader="Account"
          rows={statsByAccount(scope, { sort: accountSort, dir: accountDir, last: "activity" })}
          showShare
          showEarnings={manager}
          tag="account"
          sort={accountSort}
          dir={accountDir}
          query={query}
          sortKey="accountSort"
          dirKey="accountDir"
        />
        <ShareTable
          title="By project"
          caption="Projects this person logged time on."
          nameHeader="Project"
          rows={statsByProject(scope, { sort: projectSort, dir: projectDir, last: "activity" })}
          showShare
          showEarnings={manager}
          tag="project"
          sort={projectSort}
          dir={projectDir}
          query={query}
          sortKey="projectSort"
          dirKey="projectDir"
        />
        <Panel title={manager ? "Earnings and hours" : "Hours worked"} caption="Drag the chart, or use the arrows. Left moves into earlier periods.">
          <PeriodCharts points={safePoints(scope, manager)} showEarnings={manager} />
        </Panel>
      </div>
    </div>
  );
}

function DateRange({ from, to, preserve }: { from: string; to: string; preserve: Record<string, string> }) {
  const sunday = weekStartKey(new Date());
  const saturday = addDaysToKey(sunday, 6);
  const ranged = Boolean(from || to);
  const thisWeek = from === sunday && to === saturday;
  return (
    <>
      <label>
        <span className={labelClass}>Start (JST)</span>
        <div className="w-40">
          <input className={inputClass} type="date" name="from" defaultValue={from} />
        </div>
      </label>
      <label>
        <span className={labelClass}>End (JST)</span>
        <div className="w-40">
          <input className={inputClass} type="date" name="to" defaultValue={to} />
        </div>
      </label>
      <button className={secondaryBtn} type="submit">
        Apply
      </button>
      <Link
        href={buildHref("/statistics", { ...preserve, from: sunday, to: saturday })}
        className={cn(
          "inline-flex h-10 items-center rounded-full px-3 text-sm",
          thisWeek ? "bg-ink text-white" : "border border-line bg-white text-muted hover:text-ink",
        )}
      >
        This week
      </Link>
      <Link
        href={buildHref("/statistics", preserve)}
        className={cn(
          "inline-flex h-10 items-center rounded-full px-3 text-sm",
          ranged ? "border border-line bg-white text-ink hover:bg-canvas" : "border border-line bg-white text-muted",
        )}
      >
        Clear
      </Link>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-36 rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function safePoints(scope: ReturnType<typeof accountScope>, manager: boolean) {
  return chartPoints(scope).map((point) => (manager ? point : { ...point, earning: 0 }));
}

function readSort(value: string, allowEarnings: boolean): StatSort {
  if (value === "hours") return "hours";
  if (value === "earnings" && allowEarnings) return "earnings";
  return allowEarnings ? "earnings" : "hours";
}

function readDir(value: string): StatDir {
  return value === "asc" ? "asc" : "desc";
}

function readDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}
