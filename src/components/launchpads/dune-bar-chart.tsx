"use client";

import { formatShanghaiDate, formatUsd } from "@/lib/format";
import type { DailyPoint } from "@/lib/launchpad-types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Series = { key: string; label: string; color: string; points: DailyPoint[] };

export function DuneBarChart({
  title,
  total,
  missing,
  days,
  series,
  height = 220,
}: {
  title: string;
  total: number | null;
  missing?: string;
  days: number;
  series: Series[];
  height?: number;
}) {
  const hasPoints = series.some((s) => s.points.length > 0);
  const data = hasPoints
    ? (series[0]?.points ?? []).map((point, i) => {
        const row: Record<string, number> = { t: point.t, ms: point.t * 1000 };
        for (const s of series) {
          row[s.key] = s.points[i]?.v ?? 0;
        }
        return row;
      })
    : [];

  const barSize = days >= 90 ? 3 : days >= 60 ? 5 : 8;

  return (
    <div className="rounded-xl border border-white/8 bg-[#0b0f19] p-3">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-lg font-semibold tabular-nums text-foreground">{formatUsd(total)}</div>
        </div>
        {missing ? <p className="max-w-sm text-right text-[11px] text-amber-200/80">— {missing}</p> : null}
      </div>
      {!hasPoints ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          无日频序列，不绘制柱状图
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap={1}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="ms"
                tickFormatter={(v: number) => formatShanghaiDate(v).slice(5)}
                tick={{ fill: "#8b95a8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v: number) => formatUsd(v, 0)}
                tick={{ fill: "#8b95a8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-md border border-white/10 bg-zinc-950/95 px-2.5 py-1.5 text-[11px] shadow-lg">
                      <div className="mb-1 text-muted-foreground">{formatShanghaiDate(Number(label))}</div>
                      {payload.map((item) => (
                        <div key={String(item.dataKey)} className="flex items-center justify-between gap-4">
                          <span style={{ color: String(item.color) }}>{item.name}</span>
                          <span className="font-medium tabular-nums text-foreground">
                            {formatUsd(typeof item.value === "number" ? item.value : null)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {series.length > 1 ? (
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#8b95a8" }}
                  iconType="square"
                  iconSize={8}
                />
              ) : null}
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color}
                  maxBarSize={barSize}
                  radius={[1, 1, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
