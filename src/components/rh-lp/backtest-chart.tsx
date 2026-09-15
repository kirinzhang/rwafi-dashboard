"use client";

import { formatShanghaiDate, formatUsd } from "@/lib/format";
import type { RhLpBacktestPoint } from "@/lib/rh-lp-types";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function BacktestChart({
  points,
  emptyText,
}: {
  points: RhLpBacktestPoint[];
  emptyText: string;
}) {
  if (!points.length) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">{emptyText}</div>
    );
  }

  const data = points.map((p) => ({ ...p, ms: p.t * 1000 }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-white/8 bg-[#0b0f19] p-3">
        <div className="mb-2 text-xs text-muted-foreground">LP vs HODL vs USDG（起始 $2）</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                tickFormatter={(v: number) => formatUsd(v, 2)}
                tick={{ fill: "#8b95a8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#12161f",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) => formatShanghaiDate(Number(v))}
                formatter={(value, name) => [formatUsd(Number(value), 3), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="lpUsd" name="LP+费用" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="hodlUsd" name="HODL 50/50" stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cashUsd" name="Hold USDG" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
              <Line
                type="monotone"
                dataKey="lpNoFeesUsd"
                name="LP 未计费"
                stroke="#fbbf24"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-white/8 bg-[#0b0f19] p-3">
        <div className="mb-2 text-xs text-muted-foreground">累计费用（$2 份额）</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                tickFormatter={(v: number) => formatUsd(v, 3)}
                tick={{ fill: "#8b95a8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip
                contentStyle={{
                  background: "#12161f",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) => formatShanghaiDate(Number(v))}
                formatter={(value) => [formatUsd(Number(value), 4), "累计费用"]}
              />
              <Line type="monotone" dataKey="feesCumUsd" name="累计费用" stroke="#c084fc" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
