"use client";

import { formatShanghaiDate, formatUsd } from "@/lib/format";
import type { DailyPoint } from "@/lib/launchpad-types";
import { sliceWindow } from "@/lib/launchpad-windows";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

export function MetricSparkline({
  series,
  days,
  color,
  gradientId,
}: {
  series: DailyPoint[];
  days: number;
  color: string;
  gradientId: string;
}) {
  const data = sliceWindow(series, days).map((p) => ({ t: p.t, v: p.v, ms: p.t * 1000 }));
  if (data.length < 2) {
    return (
      <div className="flex h-14 items-center text-[11px] text-muted-foreground/70">无窗口内日频点</div>
    );
  }
  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload as { ms: number; v: number };
              return (
                <div className="rounded-md border border-white/10 bg-zinc-950/95 px-2 py-1 text-[11px] shadow-lg">
                  <div className="text-muted-foreground">{formatShanghaiDate(row.ms)}</div>
                  <div className="font-medium tabular-nums text-foreground">{formatUsd(row.v)}</div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            fill={`url(#${gradientId})`}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
