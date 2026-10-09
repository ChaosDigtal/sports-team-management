import { formatMoney, moneyAxis } from "@/lib/format";
import type { WeekPoint } from "@/lib/types";

export function WeekChart({ weeks }: { weeks: WeekPoint[] }) {
  const width = 720;
  const height = 240;
  const pad = { left: 52, right: 8, top: 16, bottom: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...weeks.map((week) => week.earnings), 1);
  const gap = 10;
  const barWidth = (innerW - gap * (weeks.length - 1)) / weeks.length;
  const ticks = [0, max / 2, max];

  return (
    <div className="px-3 py-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Weekly earnings">
        {ticks.map((tick) => {
          const y = pad.top + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e3e8ef" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#5c6b80">
                {moneyAxis(tick)}
              </text>
            </g>
          );
        })}
        {weeks.map((week, index) => {
          const barHeight = (week.earnings / max) * innerH;
          const x = pad.left + index * (barWidth + gap);
          const y = pad.top + innerH - barHeight;
          return (
            <g key={week.key}>
              <rect
                x={x}
                y={barHeight === 0 ? pad.top + innerH - 2 : y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx="3"
                fill={week.current ? "#084c3d" : "#0b6b56"}
              >
                <title>{`${week.rangeLabel}: ${formatMoney(week.earnings)}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" fontSize="11" fill="#5c6b80">
                {week.label}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Weekly earnings, Japan Standard Time</caption>
        <thead>
          <tr>
            <th>Week</th>
            <th>Earnings</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.key}>
              <td>{week.rangeLabel}</td>
              <td>{formatMoney(week.earnings)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
