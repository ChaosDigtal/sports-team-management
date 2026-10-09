import Link from "next/link";
import { EntityTag } from "@/components/entity-tag";
import { formatDateTime, formatHours, formatMoney, shareLabel } from "@/lib/format";
import type { StatRow } from "@/lib/types";
import { buildHref, cn } from "@/lib/utils";
import { EmptyRow, Panel, tdClass, thClass } from "./ui";

type SortColumn = "earnings" | "hours";

export function ShareTable({
  title,
  caption,
  nameHeader,
  rows,
  showShare,
  showEarnings,
  tag,
  sort,
  dir,
  query,
  sortKey,
  dirKey,
}: {
  title: string;
  caption: string;
  nameHeader: string;
  rows: StatRow[];
  showShare: boolean;
  showEarnings: boolean;
  tag: "user" | "account" | "project";
  sort: SortColumn;
  dir: "asc" | "desc";
  query: Record<string, string>;
  sortKey: string;
  dirKey: string;
}) {
  const earnings = rows.reduce((sum, row) => sum + row.earnings, 0);
  const hours = rows.reduce((sum, row) => sum + row.hours, 0);
  const columns = 4 + (showEarnings ? 1 : 0);
  return (
    <Panel title={title} caption={caption}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#f6f8fa]">
            <tr>
              <th className={cn(thClass, "!text-center w-16")}>Rank</th>
              <th className={cn(thClass, "!text-center")}>{nameHeader}</th>
              {showEarnings ? (
                <SortHead label="Earnings" column="earnings" sort={sort} dir={dir} query={query} sortKey={sortKey} dirKey={dirKey} />
              ) : null}
              <SortHead label="Hours" column="hours" sort={sort} dir={dir} query={query} sortKey={sortKey} dirKey={dirKey} />
              <th className={cn(thClass, "!text-center")}>Last worked at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? <EmptyRow colSpan={columns}>No logged time for this selection.</EmptyRow> : null}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#f7faf9]">
                <td className={cn(tdClass, "!text-center")}>
                  <RankMark rank={row.rank} />
                </td>
                <td className={cn(tdClass, "!text-center")}>
                  <Link href={row.href}>
                    <EntityTag id={row.id} name={row.name} kind={tag} />
                  </Link>
                </td>
                {showEarnings ? (
                  <td className={cn(tdClass, "!text-center")}>
                    <Amount text={formatMoney(row.earnings)} ratio={row.earningsShare} showShare={showShare} />
                  </td>
                ) : null}
                <td className={cn(tdClass, "!text-center")}>
                  <Amount text={formatHours(row.hours)} ratio={row.hoursShare} showShare={showShare} />
                </td>
                <td className={cn(tdClass, "!text-center")}>{formatDateTime(row.lastWorkedAt)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 ? (
            <tfoot>
              <tr className="bg-[#f6f8fa] font-medium">
                <td className={cn(tdClass, "!text-center")} />
                <td className={cn(tdClass, "!text-center")}>Total</td>
                {showEarnings ? (
                  <td className={cn(tdClass, "!text-center")}>
                    <Amount text={formatMoney(earnings)} ratio={1} showShare={showShare && earnings > 0} />
                  </td>
                ) : null}
                <td className={cn(tdClass, "!text-center")}>
                  <Amount text={formatHours(hours)} ratio={1} showShare={showShare && hours > 0} />
                </td>
                <td className={tdClass} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </Panel>
  );
}

function SortHead({
  label,
  column,
  sort,
  dir,
  query,
  sortKey,
  dirKey,
}: {
  label: string;
  column: SortColumn;
  sort: SortColumn;
  dir: "asc" | "desc";
  query: Record<string, string>;
  sortKey: string;
  dirKey: string;
}) {
  const next = sort === column && dir === "desc" ? "asc" : "desc";
  const mark = sort === column ? (dir === "asc" ? " ↑" : " ↓") : "";
  return (
    <th className={cn(thClass, "!text-center")}>
      <Link href={buildHref("/statistics", { ...query, [sortKey]: column, [dirKey]: next })} className="hover:text-ink">
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

function Amount({ text, ratio, showShare }: { text: string; ratio: number; showShare: boolean }) {
  return (
    <span className="tabular-nums">
      {text}
      {showShare ? <span className="text-muted"> ({shareLabel(ratio)})</span> : null}
    </span>
  );
}
