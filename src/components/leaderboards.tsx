import Link from "next/link";
import { EntityTag } from "@/components/entity-tag";
import { formatHours, formatMoney } from "@/lib/format";
import type { AllTimeLeader, WeekLeader } from "@/lib/stats";
import { buildHref, cn } from "@/lib/utils";
import { EmptyRow, Panel, tdClass, thClass } from "./ui";

type Dir = "asc" | "desc";
type WeekSort = "rank" | "user" | "earnings" | "hours";
type AllSort = "rank" | "user" | "earnings" | "profit" | "hours" | "gold" | "silver" | "bronze" | "medals";

export function WeekLeaderboard({
  rows,
  showEarnings,
  viewerId,
  canOpenProfiles,
  sort,
  dir,
  query,
}: {
  rows: Array<Omit<WeekLeader, "earnings"> & { earnings: number | null }>;
  showEarnings: boolean;
  viewerId: string;
  canOpenProfiles: boolean;
  sort: WeekSort;
  dir: Dir;
  query: Record<string, string>;
}) {
  const ordered = [...rows].sort((a, b) => compare(weekValue(a, sort), weekValue(b, sort), dir) || a.name.localeCompare(b.name));
  const columns = 3 + (showEarnings ? 1 : 0);
  return (
    <Panel title="This week" caption="Sunday through Saturday, Japan Standard Time. Rank is by earnings.">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#f6f8fa]">
            <tr>
              <SortTh label="Rank" column="rank" sort={sort} dir={dir} query={query} sortKey="weekSort" dirKey="weekDir" />
              <SortTh label="User" column="user" sort={sort} dir={dir} query={query} sortKey="weekSort" dirKey="weekDir" />
              {showEarnings ? (
                <SortTh label="Earnings" column="earnings" sort={sort} dir={dir} query={query} sortKey="weekSort" dirKey="weekDir" />
              ) : null}
              <SortTh label="Hours" column="hours" sort={sort} dir={dir} query={query} sortKey="weekSort" dirKey="weekDir" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ordered.length === 0 ? <EmptyRow colSpan={columns}>No one is on the roster yet.</EmptyRow> : null}
            {ordered.map((row) => (
              <tr key={row.id} className="hover:bg-[#f7faf9]">
                <td className={cn(tdClass, "!text-center")}>
                  <RankMark rank={row.rank} />
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <Person id={row.id} name={row.name} viewerId={viewerId} canOpenProfiles={canOpenProfiles} />
                </td>
                {showEarnings ? <td className={cn(tdClass, "!text-center tabular-nums")}>{formatMoney(row.earnings)}</td> : null}
                <td className={cn(tdClass, "!text-center tabular-nums")}>{formatHours(row.hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function AllTimeLeaderboard({
  rows,
  showEarnings,
  showProfit,
  viewerId,
  canOpenProfiles,
  sort,
  dir,
  query,
}: {
  rows: Array<Omit<AllTimeLeader, "earnings" | "profit"> & { earnings: number | null; profit: number | null }>;
  showEarnings: boolean;
  showProfit: boolean;
  viewerId: string;
  canOpenProfiles: boolean;
  sort: AllSort;
  dir: Dir;
  query: Record<string, string>;
}) {
  const ordered = [...rows].sort((a, b) => compare(allValue(a, sort), allValue(b, sort), dir) || a.name.localeCompare(b.name));
  const columns = 6 + (showEarnings ? 1 : 0) + (showProfit ? 1 : 0);
  return (
    <Panel title="All time" caption="Medals are awarded when a week ends, by hours worked that week. Rank is by total hours.">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#f6f8fa]">
            <tr>
              <SortTh label="Rank" column="rank" sort={sort} dir={dir} query={query} sortKey="allSort" dirKey="allDir" />
              <SortTh label="User" column="user" sort={sort} dir={dir} query={query} sortKey="allSort" dirKey="allDir" />
              {showEarnings ? (
                <SortTh label="Total earnings" column="earnings" sort={sort} dir={dir} query={query} sortKey="allSort" dirKey="allDir" />
              ) : null}
              {showProfit ? (
                <SortTh label="Total profits" column="profit" sort={sort} dir={dir} query={query} sortKey="allSort" dirKey="allDir" />
              ) : null}
              <SortTh label="Total hours" column="hours" sort={sort} dir={dir} query={query} sortKey="allSort" dirKey="allDir" />
              <SortTh label="Gold" column="gold" sort={sort} dir={dir} query={query} sortKey="allSort" dirKey="allDir" className="text-amber-700" />
              <SortTh label="Silver" column="silver" sort={sort} dir={dir} query={query} sortKey="allSort" dirKey="allDir" className="text-slate-500" />
              <SortTh label="Bronze" column="bronze" sort={sort} dir={dir} query={query} sortKey="allSort" dirKey="allDir" className="text-orange-800" />
              <SortTh label="Medals" column="medals" sort={sort} dir={dir} query={query} sortKey="allSort" dirKey="allDir" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ordered.length === 0 ? <EmptyRow colSpan={columns}>No one is on the roster yet.</EmptyRow> : null}
            {ordered.map((row) => (
              <tr key={row.id} className="hover:bg-[#f7faf9]">
                <td className={cn(tdClass, "!text-center")}>
                  <RankMark rank={row.rank} />
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <Person id={row.id} name={row.name} viewerId={viewerId} canOpenProfiles={canOpenProfiles} />
                </td>
                {showEarnings ? <td className={cn(tdClass, "!text-center tabular-nums")}>{formatMoney(row.earnings)}</td> : null}
                {showProfit ? <td className={cn(tdClass, "!text-center tabular-nums")}>{formatMoney(row.profit)}</td> : null}
                <td className={cn(tdClass, "!text-center tabular-nums")}>{formatHours(row.hours)}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{row.gold}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{row.silver}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{row.bronze}</td>
                <td className={cn(tdClass, "!text-center tabular-nums")}>{row.medals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function weekValue(row: Omit<WeekLeader, "earnings"> & { earnings: number | null }, sort: WeekSort) {
  if (sort === "user") return row.name;
  if (sort === "earnings") return row.earnings ?? 0;
  if (sort === "hours") return row.hours;
  return row.rank;
}

function allValue(
  row: Omit<AllTimeLeader, "earnings" | "profit"> & { earnings: number | null; profit: number | null },
  sort: AllSort,
) {
  if (sort === "user") return row.name;
  if (sort === "earnings") return row.earnings ?? 0;
  if (sort === "profit") return row.profit ?? 0;
  if (sort === "hours") return row.hours;
  if (sort === "gold") return row.gold;
  if (sort === "silver") return row.silver;
  if (sort === "bronze") return row.bronze;
  if (sort === "medals") return row.medals;
  return row.rank;
}

function compare(a: string | number, b: string | number, dir: Dir) {
  const sign = dir === "asc" ? 1 : -1;
  if (typeof a === "string" || typeof b === "string") return String(a).localeCompare(String(b)) * sign;
  return (a - b) * sign;
}

function SortTh({
  label,
  column,
  sort,
  dir,
  query,
  sortKey,
  dirKey,
  className,
}: {
  label: string;
  column: string;
  sort: string;
  dir: Dir;
  query: Record<string, string>;
  sortKey: string;
  dirKey: string;
  className?: string;
}) {
  const next = sort === column && dir === "desc" ? "asc" : "desc";
  const mark = sort === column ? (dir === "asc" ? " ↑" : " ↓") : "";
  return (
    <th className={cn(thClass, "!text-center", className)}>
      <Link href={buildHref("/dashboard", { ...query, [sortKey]: column, [dirKey]: next })} className="hover:text-ink">
        {label}
        {mark}
      </Link>
    </th>
  );
}

function RankMark({ rank }: { rank: number }) {
  if (rank > 3) return <span className="tabular-nums text-muted">{rank}</span>;
  const color = rank === 1 ? "#d4a017" : rank === 2 ? "#8d97a3" : "#b26a3a";
  const label = rank === 1 ? "Gold" : rank === 2 ? "Silver" : "Bronze";
  return (
    <span className="inline-flex items-center justify-center" title={`${label}, rank ${rank}`}>
      <svg viewBox="0 0 32 32" className="mx-auto size-7" role="img" aria-label={`${label} medal`}>
        <path d="M10 2h5l1 9h-7L10 2zm7 0h5l1 9h-7l1-9z" fill={rank === 1 ? "#f3e2a4" : "#e4e8ee"} />
        <circle cx="16" cy="20" r="8" fill={color} />
        <circle cx="16" cy="20" r="5.2" fill="none" stroke="white" strokeWidth="1.2" />
        <text x="16" y="23" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">
          {rank}
        </text>
      </svg>
    </span>
  );
}

function Person({
  id,
  name,
  viewerId,
  canOpenProfiles,
}: {
  id: string;
  name: string;
  viewerId: string;
  canOpenProfiles: boolean;
}) {
  const tag = <EntityTag id={id} name={name} kind="user" />;
  if (!canOpenProfiles && id !== viewerId) return tag;
  return <Link href={`/users/${id}`}>{tag}</Link>;
}
