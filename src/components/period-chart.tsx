"use client";

import { useMemo, useRef, useState } from "react";
import { formatHours, formatMoney } from "@/lib/format";
import { addDaysToKey, jstDateKey, shortDay, weekStartKey } from "@/lib/time";
import type { ChartPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

type Grain = "day" | "week" | "month" | "year";

const GRAINS: Array<{ id: Grain; label: string; window: number }> = [
  { id: "day", label: "Daily", window: 14 },
  { id: "week", label: "Weekly", window: 12 },
  { id: "month", label: "Monthly", window: 12 },
  { id: "year", label: "Yearly", window: 6 },
];

export function PeriodCharts({ points, showEarnings }: { points: ChartPoint[]; showEarnings: boolean }) {
  const [grain, setGrain] = useState<Grain>("week");
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ x: number; offset: number } | null>(null);
  const spec = GRAINS.find((item) => item.id === grain) ?? GRAINS[1];
  const buckets = useMemo(() => bucket(points, grain), [points, grain]);
  const current = currentKey(grain);
  const end = shiftKey(current, grain, -offset);
  const keys: string[] = [];
  for (let index = spec.window - 1; index >= 0; index -= 1) keys.push(shiftKey(end, grain, -index));

  return (
    <div className="px-3 py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {GRAINS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-sm",
                grain === item.id ? "bg-ink text-white" : "border border-line bg-white text-muted hover:text-ink",
              )}
              onClick={() => {
                setGrain(item.id);
                setOffset(0);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {periodLabel(keys[0], grain)} – {periodLabel(keys[keys.length - 1], grain)}
          </span>
          <button type="button" className="rounded-md border border-line px-2 py-1 text-sm hover:bg-canvas" onClick={() => setOffset((value) => Math.min(400, value + 1))} aria-label="Earlier">
            ←
          </button>
          <button
            type="button"
            className="rounded-md border border-line px-2 py-1 text-sm hover:bg-canvas disabled:opacity-40"
            onClick={() => setOffset((value) => Math.max(1 - spec.window, value - 1))}
            disabled={offset <= 1 - spec.window}
            aria-label="Later"
          >
            →
          </button>
        </div>
      </div>
      <div
        className="cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, offset };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const steps = Math.trunc((drag.current.x - event.clientX) / 56);
          setOffset(Math.max(1 - spec.window, Math.min(400, drag.current.offset + steps)));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
      {showEarnings ? (
        <BarChart
          title="Earnings"
          keys={keys}
          current={current}
          values={keys.map((key) => buckets.get(key)?.earning ?? 0)}
          color="#0b6b56"
          currentColor="#084c3d"
          format={(value) => formatMoney(value)}
        />
      ) : null}
      <BarChart
        title="Hours worked"
        keys={keys}
        current={current}
        values={keys.map((key) => buckets.get(key)?.hours ?? 0)}
        color="#2563eb"
        currentColor="#1e3a8a"
        format={(value) => formatHours(value)}
      />
      </div>
      <p className="mt-2 text-xs text-muted">Japan Standard Time. A task counts in the period it started. Drag the chart or use the arrows. Moving left shows earlier periods.</p>
    </div>
  );
}

function BarChart({
  title,
  keys,
  values,
  current,
  color,
  currentColor,
  format,
}: {
  title: string;
  keys: string[];
  values: number[];
  current: string;
  color: string;
  currentColor: string;
  format: (value: number) => string;
}) {
  const width = Math.max(720, keys.length * 76);
  const height = 250;
  const pad = { left: 16, right: 16, top: 28, bottom: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...values, 1);
  const gap = 8;
  const barWidth = (innerW - gap * (keys.length - 1)) / keys.length;

  return (
    <div className="mb-4 overflow-x-auto">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 min-w-full" role="img" aria-label={title}>
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#e3e8ef" />
        {keys.map((key, index) => {
          const value = values[index] ?? 0;
          const barHeight = (value / max) * innerH;
          const x = pad.left + index * (barWidth + gap);
          const y = pad.top + innerH - barHeight;
          const label = format(value);
          return (
            <g key={key}>
              <rect x={x} y={barHeight === 0 ? pad.top + innerH - 2 : y} width={barWidth} height={Math.max(barHeight, 2)} rx="3" fill={key === current ? currentColor : color}>
                <title>{`${periodLabel(key, key.length === 4 ? "year" : key.length === 7 ? "month" : "day")}: ${label}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={Math.max(12, y - 6)} textAnchor="middle" fontSize="10" fontWeight="600" fill="#172033">
                {label}
              </text>
              <text x={x + barWidth / 2} y={height - 14} textAnchor="middle" fontSize="11" fill="#5c6b80">
                {periodLabel(key, key.length === 4 ? "year" : key.length === 7 ? "month" : key.length === 10 ? "day" : "week")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function bucket(points: ChartPoint[], grain: Grain) {
  const map = new Map<string, { earning: number; hours: number }>();
  for (const point of points) {
    const key = periodKey(point.start, grain);
    const current = map.get(key) ?? { earning: 0, hours: 0 };
    current.earning += point.earning;
    current.hours += point.hours;
    map.set(key, current);
  }
  return map;
}

function periodKey(iso: string, grain: Grain) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (grain === "day") return jstDateKey(date);
  if (grain === "week") return weekStartKey(date);
  const day = jstDateKey(date);
  if (grain === "month") return day.slice(0, 7);
  return day.slice(0, 4);
}

function currentKey(grain: Grain) {
  return periodKey(new Date().toISOString(), grain);
}

function shiftKey(key: string, grain: Grain, delta: number) {
  if (!key) return key;
  if (grain === "day") return addDaysToKey(key, delta);
  if (grain === "week") return addDaysToKey(key, delta * 7);
  if (grain === "month") {
    const [year, month] = key.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1 + delta, 1));
    return date.toISOString().slice(0, 7);
  }
  return String(Number(key) + delta);
}

function periodLabel(key: string, grain: Grain) {
  if (!key) return "";
  if (grain === "year" || key.length === 4) return key;
  if (grain === "month" || key.length === 7) {
    const [year, month] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  }
  return shortDay(key);
}
