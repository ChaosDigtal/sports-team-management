import { getDb } from "./db";
import { round2 } from "./format";
import { defaultWithdrawalMinutes, jstDayBounds, nextWeeklyInstant, recentWeekKeys, shortDay, WEEK_COUNT, weekBounds, weekRangeLabel, weekStartKey } from "./time";
import type { ChartPoint, StatRow, WeekPoint } from "./types";

type Row = Record<string, unknown>;

function num0(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

export type Scope = {
  where: string;
  params: Array<string | number | null>;
};

export function accountScope(accountId: string): Scope {
  return { where: "t.account_id = ?", params: [accountId] };
}

export function projectScope(projectId: string): Scope {
  return { where: "t.project_id = ?", params: [projectId] };
}

export function userScope(userId: string): Scope {
  return { where: "t.user_id = ?", params: [userId] };
}

export function allScope(): Scope {
  return { where: "1 = 1", params: [] };
}

export function withRange(scope: Scope, from?: string, to?: string): Scope {
  if (!from && !to) return scope;
  const where = [scope.where];
  const params = [...scope.params];
  if (from) {
    where.push("t.start_time >= ?");
    params.push(jstDayBounds(from).start.toISOString());
  }
  if (to) {
    where.push("t.start_time <= ?");
    params.push(jstDayBounds(to).end.toISOString());
  }
  where.push("t.start_time != ''");
  return { where: where.join(" AND "), params };
}

export type StatSort = "earnings" | "hours";
export type StatDir = "asc" | "desc";
export type StatLast = "activity" | "completed";

function rankRows(
  rows: Array<{ id: string; name: string; href: string; earnings: number; hours: number; lastWorkedAt: string }>,
  sort: StatSort,
  dir: StatDir,
): StatRow[] {
  const earningsTotal = rows.reduce((sum, row) => sum + row.earnings, 0);
  const hoursTotal = rows.reduce((sum, row) => sum + row.hours, 0);
  const signed = dir === "asc" ? 1 : -1;
  return [...rows]
    .sort((a, b) => {
      const diff = sort === "hours" ? a.hours - b.hours : a.earnings - b.earnings;
      if (diff !== 0) return diff * signed;
      return a.name.localeCompare(b.name);
    })
    .map((row, index) => ({
      ...row,
      earnings: round2(row.earnings),
      hours: round2(row.hours),
      rank: index + 1,
      earningsShare: earningsTotal > 0 ? row.earnings / earningsTotal : 0,
      hoursShare: hoursTotal > 0 ? row.hours / hoursTotal : 0,
    }));
}

function grouped(
  scope: Scope,
  kind: "user" | "account" | "project",
  options?: { sort?: StatSort; dir?: StatDir; last?: StatLast },
): StatRow[] {
  const column = kind === "user" ? "user_id" : kind === "account" ? "account_id" : "project_id";
  const join =
    kind === "user"
      ? `JOIN users x ON x.id = t.user_id`
      : kind === "account"
        ? `JOIN "DA_accounts" x ON x.id = t.account_id`
        : `JOIN "DA_projects" x ON x.id = t.project_id`;
  const hrefPrefix = kind === "user" ? "/users/" : kind === "account" ? "/accounts/" : "/projects/";
  const lastExpr =
    options?.last === "completed"
      ? `MAX(CASE WHEN t.status = 'Completed' AND t.end_time != '' THEN t.end_time END)`
      : `MAX(CASE WHEN t.end_time != '' AND (t.start_time = '' OR t.end_time >= t.start_time) THEN t.end_time WHEN t.start_time != '' THEN t.start_time END)`;
  const rows = getDb()
    .prepare(
      `
      SELECT t.${column} AS id, x.name AS name,
        COALESCE(SUM(CASE WHEN t.status = 'Exited' THEN 0 ELSE t.earning END), 0) AS earnings,
        COALESCE(SUM(t.logged_hours), 0) AS hours,
        ${lastExpr} AS last_worked
      FROM "DA_tasks" t
      ${join}
      WHERE ${scope.where}
      GROUP BY t.${column}
    `,
    )
    .all(...scope.params) as Row[];

  return rankRows(
    rows.map((row) => ({
      id: text(row.id),
      name: text(row.name),
      href: `${hrefPrefix}${text(row.id)}`,
      earnings: num0(row.earnings),
      hours: num0(row.hours),
      lastWorkedAt: text(row.last_worked),
    })),
    options?.sort === "hours" ? "hours" : "earnings",
    options?.dir === "asc" ? "asc" : "desc",
  );
}

export function statsByUser(scope: Scope, options?: { sort?: StatSort; dir?: StatDir; last?: StatLast }) {
  return grouped(scope, "user", options);
}

export function statsByAccount(scope: Scope, options?: { sort?: StatSort; dir?: StatDir; last?: StatLast }) {
  return grouped(scope, "account", options);
}

export function statsByProject(scope: Scope, options?: { sort?: StatSort; dir?: StatDir; last?: StatLast }) {
  return grouped(scope, "project", options);
}

const PAYOUT_WAIT_MS = 7 * 24 * 60 * 60 * 1000;

export function payoutCutoff(now = new Date()) {
  return new Date(now.getTime() - PAYOUT_WAIT_MS).toISOString();
}

export type AccountPayout = {
  accountId: string;
  sharePercent: number;
  totalEarnings: number;
  eligible: number;
  pending: number;
  withdrawn: number;
  available: number;
  hours: number;
};

export function accountPayouts(accountId?: string, now = new Date()): AccountPayout[] {
  const cutoff = payoutCutoff(now);
  const where = accountId ? "WHERE a.id = ?" : "";
  const params = accountId ? [cutoff, cutoff, accountId] : [cutoff, cutoff];
  const rows = getDb()
    .prepare(
      `
      SELECT a.id AS id, COALESCE(a.sharing_percent, 0) AS share_percent,
        COALESCE(SUM(CASE WHEN t.status = 'Completed' THEN t.earning ELSE 0 END), 0) AS total_earnings,
        COALESCE(SUM(CASE WHEN t.status = 'Completed' AND t.end_time != '' AND t.end_time <= ? AND t.withdrawal_id = '' THEN t.earning ELSE 0 END), 0) AS eligible,
        COALESCE(SUM(CASE WHEN t.status = 'Completed' AND t.withdrawal_id = '' AND (t.end_time = '' OR t.end_time > ?) THEN t.earning ELSE 0 END), 0) AS pending,
        COALESCE(SUM(t.logged_hours), 0) AS hours
      FROM "DA_accounts" a
      LEFT JOIN "DA_tasks" t ON t.account_id = a.id
      ${where}
      GROUP BY a.id
    `,
    )
    .all(...params) as Row[];
  const withdrawnRows = getDb()
    .prepare(
      `SELECT account_id AS id, COALESCE(SUM(amount), 0) AS withdrawn FROM "DA_withdrawals" ${accountId ? "WHERE account_id = ?" : ""} GROUP BY account_id`,
    )
    .all(...(accountId ? [accountId] : [])) as Row[];
  const withdrawn = new Map(withdrawnRows.map((row) => [text(row.id), num0(row.withdrawn)]));
  return rows.map((row) => {
    const eligible = round2(num0(row.eligible));
    return {
      accountId: text(row.id),
      sharePercent: num0(row.share_percent),
      totalEarnings: round2(num0(row.total_earnings)),
      eligible,
      pending: round2(num0(row.pending)),
      withdrawn: round2(withdrawn.get(text(row.id)) ?? 0),
      available: eligible,
      hours: round2(num0(row.hours)),
    };
  });
}

export function payoutSummary(accountId?: string, now = new Date()) {
  return accountPayouts(accountId, now).reduce(
    (sum, row) => ({
      totalEarnings: round2(sum.totalEarnings + row.totalEarnings),
      available: round2(sum.available + row.available),
      pending: round2(sum.pending + row.pending),
      hours: round2(sum.hours + row.hours),
    }),
    { totalEarnings: 0, available: 0, pending: 0, hours: 0 },
  );
}

export function selectionTotals(scope: Scope) {
  const row = getDb()
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE WHEN t.status = 'Completed' THEN t.earning ELSE 0 END), 0) AS earnings,
        COALESCE(SUM(t.logged_hours), 0) AS hours,
        COALESCE(SUM(CASE WHEN t.status = 'Completed' THEN t.earning * COALESCE(a.sharing_percent, 0) / 100.0 ELSE 0 END), 0) AS profit
      FROM "DA_tasks" t
      JOIN "DA_accounts" a ON a.id = t.account_id
      WHERE ${scope.where}
    `,
    )
    .get(...scope.params) as Row;
  return {
    earnings: round2(num0(row.earnings)),
    hours: round2(num0(row.hours)),
    profit: round2(num0(row.profit)),
  };
}

export function chartPoints(scope: Scope): ChartPoint[] {
  const rows = getDb()
    .prepare(
      `
      SELECT t.start_time AS start_time,
        CASE WHEN t.status = 'Exited' THEN 0 ELSE COALESCE(t.earning, 0) END AS earning,
        COALESCE(t.logged_hours, 0) AS hours
      FROM "DA_tasks" t
      WHERE ${scope.where} AND t.start_time != ''
    `,
    )
    .all(...scope.params) as Row[];
  return rows.map((row) => ({
    start: text(row.start_time),
    earning: round2(num0(row.earning)),
    hours: round2(num0(row.hours)),
  }));
}

export function weeklyEarnings(scope: Scope, now = new Date()): WeekPoint[] {
  const keys = recentWeekKeys(WEEK_COUNT, now);
  const current = weekStartKey(now);
  const rows = getDb()
    .prepare(
      `SELECT start_time AS start_time, CASE WHEN t.status = 'Exited' THEN 0 ELSE COALESCE(t.earning, 0) END AS earning FROM "DA_tasks" t WHERE ${scope.where} AND t.start_time != ''`,
    )
    .all(...scope.params) as Row[];
  const buckets = new Map(keys.map((key) => [key, 0]));
  for (const row of rows) {
    const key = weekStartKey(new Date(text(row.start_time)));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + num0(row.earning));
  }
  return keys.map((key) => ({
    key,
    label: shortDay(key),
    rangeLabel: weekRangeLabel(key),
    earnings: round2(buckets.get(key) ?? 0),
    current: key === current,
  }));
}

export type WeekLeader = {
  id: string;
  name: string;
  rank: number;
  earnings: number;
  hours: number;
};

export type AllTimeLeader = WeekLeader & {
  profit: number;
  gold: number;
  silver: number;
  bronze: number;
  medals: number;
};

export function leaderboards(now = new Date()) {
  const bounds = weekBounds(weekStartKey(now));
  const startIso = bounds.start.toISOString();
  const endIso = bounds.end.toISOString();
  const current = weekStartKey(now);
  const people = new Map<string, {
    id: string;
    name: string;
    weekEarnings: number;
    weekHours: number;
    earnings: number;
    hours: number;
    profit: number;
    gold: number;
    silver: number;
    bronze: number;
  }>();
  const roster = getDb()
    .prepare(
      `
      SELECT u.id AS id, u.name AS name
      FROM users u
      WHERE EXISTS (SELECT 1 FROM user_platform_roles r WHERE r.user_id = u.id AND r.platform = 'da')
         OR EXISTS (SELECT 1 FROM "DA_tasks" t WHERE t.user_id = u.id)
    `,
    )
    .all() as Row[];
  for (const row of roster) {
    people.set(text(row.id), {
      id: text(row.id),
      name: text(row.name),
      weekEarnings: 0,
      weekHours: 0,
      earnings: 0,
      hours: 0,
      profit: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
    });
  }
  const tasks = getDb()
    .prepare(
      `
      SELECT t.user_id AS user_id, u.name AS name, t.start_time AS start_time,
        COALESCE(t.logged_hours, 0) AS hours,
        CASE WHEN t.status = 'Exited' THEN 0 ELSE COALESCE(t.earning, 0) END AS earning,
        CASE WHEN t.status = 'Completed' THEN COALESCE(t.earning, 0) * COALESCE(a.sharing_percent, 0) / 100.0 ELSE 0 END AS profit
      FROM "DA_tasks" t
      JOIN users u ON u.id = t.user_id
      JOIN "DA_accounts" a ON a.id = t.account_id
    `,
    )
    .all() as Row[];
  const weekHours = new Map<string, Map<string, number>>();
  for (const row of tasks) {
    const id = text(row.user_id);
    const person = people.get(id) ?? {
      id,
      name: text(row.name),
      weekEarnings: 0,
      weekHours: 0,
      earnings: 0,
      hours: 0,
      profit: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
    };
    people.set(id, person);
    const hours = num0(row.hours);
    const earning = num0(row.earning);
    person.hours += hours;
    person.earnings += earning;
    person.profit += num0(row.profit);
    const start = text(row.start_time);
    if (!start) continue;
    const key = weekStartKey(new Date(start));
    const byUser = weekHours.get(key) ?? new Map<string, number>();
    byUser.set(id, (byUser.get(id) ?? 0) + hours);
    weekHours.set(key, byUser);
    if (start >= startIso && start <= endIso) {
      person.weekHours += hours;
      person.weekEarnings += earning;
    }
  }
  for (const [key, byUser] of weekHours) {
    if (key >= current) continue;
    const ranked = [...byUser.entries()]
      .map(([id, hours]) => ({ id, hours: round2(hours) }))
      .filter((row) => row.hours > 0)
      .sort((a, b) => b.hours - a.hours || a.id.localeCompare(b.id));
    let lastHours = Number.NaN;
    let place = 0;
    ranked.forEach((row, index) => {
      if (row.hours !== lastHours) {
        place = index + 1;
        lastHours = row.hours;
      }
      const person = people.get(row.id);
      if (!person) return;
      if (place === 1) person.gold += 1;
      else if (place === 2) person.silver += 1;
      else if (place === 3) person.bronze += 1;
    });
  }
  const week: WeekLeader[] = [...people.values()]
    .sort((a, b) => b.weekEarnings - a.weekEarnings || b.weekHours - a.weekHours || a.name.localeCompare(b.name))
    .map((person, index) => ({
      id: person.id,
      name: person.name,
      rank: index + 1,
      earnings: round2(person.weekEarnings),
      hours: round2(person.weekHours),
    }));
  const allTime: AllTimeLeader[] = [...people.values()]
    .sort((a, b) => b.hours - a.hours || b.earnings - a.earnings || a.name.localeCompare(b.name))
    .map((person, index) => ({
      id: person.id,
      name: person.name,
      rank: index + 1,
      earnings: round2(person.earnings),
      hours: round2(person.hours),
      profit: round2(person.profit),
      gold: person.gold,
      silver: person.silver,
      bronze: person.bronze,
      medals: person.gold + person.silver + person.bronze,
    }));
  return { week, allTime };
}

export type ProfitEstimate = { amount: number; calculatedAt: string };

export function readProfitEstimate() {
  const row = getDb()
    .prepare(`SELECT amount, calculated_at FROM dashboard_estimates WHERE key = 'week-profit'`)
    .get() as Row | undefined;
  if (!row) return null;
  return { amount: round2(num0(row.amount)), calculatedAt: text(row.calculated_at) };
}

export function calculateEstimatedProfit(now = new Date()) {
  const accounts = getDb()
    .prepare(
      `
      SELECT id, timezone, COALESCE(sharing_percent, 0) AS share, withdrawal_weekday, withdrawal_minutes
      FROM "DA_accounts"
    `,
    )
    .all() as Row[];
  let profit = 0;
  for (const account of accounts) {
    const weekday = num0(account.withdrawal_weekday);
    const minutes = account.withdrawal_minutes == null ? defaultWithdrawalMinutes(text(account.timezone)) : num0(account.withdrawal_minutes);
    const next = nextWeeklyInstant(weekday, minutes, now);
    const cutoff = new Date(next.getTime() - PAYOUT_WAIT_MS).toISOString();
    const row = getDb()
      .prepare(
        `
        SELECT COALESCE(SUM(earning), 0) AS funds
        FROM "DA_tasks"
        WHERE account_id = ? AND status = 'Completed' AND withdrawal_id = '' AND end_time != '' AND end_time <= ?
      `,
      )
      .get(text(account.id), cutoff) as Row;
    profit += (num0(row.funds) * num0(account.share)) / 100;
  }
  return round2(profit * 0.97);
}

export function refreshProfitEstimate(now = new Date()) {
  const amount = calculateEstimatedProfit(now);
  const calculatedAt = now.toISOString();
  getDb()
    .prepare(
      `
      INSERT INTO dashboard_estimates (key, amount, calculated_at) VALUES ('week-profit', ?, ?)
      ON CONFLICT(key) DO UPDATE SET amount = excluded.amount, calculated_at = excluded.calculated_at
    `,
    )
    .run(amount, calculatedAt);
  return { amount, calculatedAt };
}

export function summarize(scope: Scope, now = new Date()) {
  const totals = getDb()
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN t.status = 'Exited' THEN 0 ELSE t.earning END), 0) AS earnings, COALESCE(SUM(logged_hours), 0) AS hours FROM "DA_tasks" t WHERE ${scope.where}`,
    )
    .get(...scope.params) as Row;
  const bounds = weekBounds(weekStartKey(now));
  const week = getDb()
    .prepare(
      `
      SELECT COALESCE(SUM(CASE WHEN t.status = 'Exited' THEN 0 ELSE t.earning END), 0) AS earnings, COALESCE(SUM(logged_hours), 0) AS hours
      FROM "DA_tasks" t
      WHERE ${scope.where} AND t.start_time >= ? AND t.start_time <= ?
    `,
    )
    .get(...scope.params, bounds.start.toISOString(), bounds.end.toISOString()) as Row;
  const wip = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM "DA_tasks" t WHERE ${scope.where} AND t.status = 'WIP'`)
    .get(...scope.params) as Row;
  return {
    earnings: round2(num0(totals.earnings)),
    hours: round2(num0(totals.hours)),
    weekEarnings: round2(num0(week.earnings)),
    weekHours: round2(num0(week.hours)),
    wip: num0(wip.n),
    weeks: weeklyEarnings(scope, now),
  };
}
