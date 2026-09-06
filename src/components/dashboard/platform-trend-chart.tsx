"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatShanghaiDate, formatUsd } from "@/lib/format";
import type { EquityPlatformHistory } from "@/lib/types";
import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RANGES = [
  { key: "90d", label: "90天", days: 90 },
  { key: "180d", label: "180天", days: 180 },
  { key: "all", label: "全部", days: null },
] as const;

type Mode = "stack" | "line";

export function PlatformTrendChart({ history }: { history: EquityPlatformHistory }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("180d");
  const [mode, setMode] = useState<Mode>("stack");
  const [showTotal, setShowTotal] = useState(true);

  const latestTotal = history.points.at(-1)?.total ?? null;
  const data = useMemo(() => {
    const selected = RANGES.find((r) => r.key === range);
    const cutoff = selected?.days ? Date.now() / 1000 - selected.days * 86400 : 0;
    return history.points
      .filter((p) => p.date >= cutoff)
      .map((p) => ({
        date: p.date,
        ms: p.date * 1000,
        total: p.total,
        ...p.values,
      }));
  }, [history.points, range]);

  return (
    <Card className="border-white/5 bg-card/80">
      <CardHeader className="border-b border-white/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>各平台美股代币总量趋势</CardTitle>
            <CardDescription>
              DefiLlama protocol TVL（AUM 代理）· 按日对齐，缺失日沿用上一观测值 · 不编造无历史的发行方
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">合计（最新）</div>
            <div className="text-lg font-semibold tabular-nums">{formatUsd(latestTotal)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {!history.series.length || !data.length ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            暂无各平台历史 TVL。
          </div>
        ) : (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
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
              <div className="flex flex-wrap gap-1">
                <Button
                  size="xs"
                  variant={mode === "stack" ? "secondary" : "ghost"}
                  onClick={() => setMode("stack")}
                >
                  堆叠面积
                </Button>
                <Button
                  size="xs"
                  variant={mode === "line" ? "secondary" : "ghost"}
                  onClick={() => setMode("line")}
                >
                  分平台折线
                </Button>
                <Button
                  size="xs"
                  variant={showTotal ? "secondary" : "ghost"}
                  onClick={() => setShowTotal((v) => !v)}
                >
                  合计线
                </Button>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                    formatter={(value, name) => [formatUsd(Number(value)), String(name)]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                  />
                  {history.series.map((item) => (
                    <Area
                      key={item.slug}
                      type="monotone"
                      dataKey={item.slug}
                      name={item.displayName}
                      stackId={mode === "stack" ? "equity" : undefined}
                      stroke={item.color}
                      fill={item.color}
                      fillOpacity={mode === "stack" ? 0.55 : 0.1}
                      strokeWidth={mode === "stack" ? 1 : 2}
                    />
                  ))}
                  {showTotal ? (
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="合计"
                      stroke="#f8fafc"
                      strokeWidth={1.6}
                      strokeDasharray="5 4"
                      dot={false}
                      legendType="line"
                    />
                  ) : null}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              单位为 DefiLlama 协议 TVL，用作代币化美股 AUM 代理。堆叠面积的高度等于合计；折线模式便于对比各平台增速。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
