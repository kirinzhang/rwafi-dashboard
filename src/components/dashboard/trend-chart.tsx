"use client";

import { formatShanghaiDate, formatUsd } from "@/lib/format";
import type { SeriesPoint } from "@/lib/types";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";

const RANGES = [
  { key: "90d", label: "90天", days: 90 },
  { key: "1y", label: "1年", days: 365 },
  { key: "all", label: "全部", days: null },
] as const;

export function TrendChart({
  series,
  color = "#34d399",
  emptyText = "暂无历史序列",
}: {
  series: SeriesPoint[];
  color?: string;
  emptyText?: string;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("1y");
  const gradientId = `fill-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  const data = useMemo(() => {
    const selected = RANGES.find((r) => r.key === range);
    const cutoff = selected?.days ? Date.now() / 1000 - selected.days * 86400 : 0;
    return series
      .filter((p) => p.date >= cutoff)
      .map((p) => ({ ...p, ms: p.date * 1000 }));
  }, [series, range]);

  if (!series.length) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        {RANGES.map((item) => (
          <Button
            key={item.key}
            size="xs"
            variant={range === item.key ? "secondary" : "ghost"}
            onClick={() => setRange(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="ms"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => formatShanghaiDate(v)}
              tick={{ fill: "#8b95a8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(v: number) => formatUsd(v, 1)}
              tick={{ fill: "#8b95a8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "#12161f",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(v) => formatShanghaiDate(Number(v))}
              formatter={(value) => [formatUsd(Number(value)), "流通 / TVL"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={`url(#${gradientId})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
