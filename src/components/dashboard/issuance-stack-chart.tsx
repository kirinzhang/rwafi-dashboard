"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatShare, formatShanghaiDate, formatUsd } from "@/lib/format";
import { OTHER_STACK_KEY, weeklyLastSnapshot } from "@/lib/series";
import type { StackedIssuanceHistory } from "@/lib/types";
import { useMemo, useState } from "react";
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

const RANGES = [
  { key: "30d", label: "最近 30 天", days: 30 },
  { key: "60d", label: "最近 60 天", days: 60 },
  { key: "90d", label: "最近 90 天", days: 90 },
  { key: "all", label: "全部", days: null },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];
type Dimension = "issuer" | "stock";

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: "issuer", label: "按发行方" },
  { key: "stock", label: "按股票" },
];

export function IssuanceStackChart({
  issuerHistory,
  tickerHistory,
}: {
  issuerHistory: StackedIssuanceHistory;
  tickerHistory: StackedIssuanceHistory;
}) {
  const [range, setRange] = useState<RangeKey>("90d");
  const [dimension, setDimension] = useState<Dimension>("issuer");
  const history = dimension === "issuer" ? issuerHistory : tickerHistory;
  const issuerTotal = issuerHistory.points.at(-1)?.total ?? null;
  const latestTotal = history.points.at(-1)?.total ?? null;
  const totalsDiverge =
    dimension === "stock" &&
    issuerTotal != null &&
    latestTotal != null &&
    issuerTotal > 0 &&
    Math.abs(latestTotal - issuerTotal) / issuerTotal > 0.02;
  const hasMappedSeries = history.series.some((item) => item.key !== OTHER_STACK_KEY);
  const showEmptyStock = dimension === "stock" && !hasMappedSeries;

  const data = useMemo(() => {
    const selected = RANGES.find((item) => item.key === range);
    const end = history.points.at(-1)?.date;
    const cutoff = selected?.days && end != null ? end - selected.days * 86400 : 0;
    const sliced = history.points.filter((p) => p.date > cutoff);
    const grain = range === "all" ? weeklyLastSnapshot(sliced) : sliced;
    return grain.map((p) => ({
      date: p.date,
      ms: p.date * 1000,
      total: p.total,
      ...p.values,
    }));
  }, [history.points, range]);

  const barSize = range === "all" ? 5 : range === "90d" ? 4 : range === "60d" ? 6 : 8;

  return (
    <Card className="border-white/5 bg-card/80">
      <CardHeader className="border-b border-white/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <CardTitle>代币化美股发行量（堆叠）</CardTitle>
            <CardDescription>
              Y 轴 = {history.yAxisZh} · 不是 rwa.xyz 发行方 AUM · {history.rankingRuleZh}
            </CardDescription>
            <div className="flex flex-wrap gap-1">
              {DIMENSIONS.map((item) => (
                <Button
                  key={item.key}
                  size="xs"
                  variant={dimension === item.key ? "secondary" : "ghost"}
                  onClick={() => setDimension(item.key)}
                  aria-pressed={dimension === item.key}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">最新合计</div>
            <div className="text-lg font-semibold tabular-nums">{formatUsd(latestTotal)}</div>
            {dimension === "stock" && issuerTotal != null ? (
              <div className="text-[11px] text-muted-foreground">
                按发行方 {formatUsd(issuerTotal)}
                {totalsDiverge ? " · 偏差已标出" : " · 已对齐"}
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
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
        {showEmptyStock ? (
          <div className="flex h-80 items-center justify-center rounded-xl border border-white/8 bg-[#0b0f19] px-6 text-center text-sm text-muted-foreground">
            暂无按股票拆分：当前 tokensInUsd 无法映射为 TradFi
            ticker（如 USD+ / USDT），也没有用发行方合计编造个股序列。可切回「按发行方」。
          </div>
        ) : !history.series.length || !data.length ? (
          <div className="flex h-80 items-center justify-center rounded-xl border border-white/8 bg-[#0b0f19] text-sm text-muted-foreground">
            {dimension === "issuer"
              ? "暂无 DefiLlama 协议 TVL 日频序列。"
              : "暂无 DefiLlama tokensInUsd 日频序列。"}
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 bg-[#0b0f19] p-3">
            <div className="h-[340px] w-full">
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
                    tickFormatter={(v: number) => formatUsd(v, 1)}
                    tick={{ fill: "#8b95a8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const total = payload.reduce(
                        (sum, item) => sum + (typeof item.value === "number" ? item.value : 0),
                        0,
                      );
                      const byKey = new Map(
                        payload.map((item) => [String(item.dataKey), Number(item.value) || 0]),
                      );
                      return (
                        <div className="max-w-xs rounded-md border border-white/10 bg-zinc-950/95 px-2.5 py-2 text-[11px] shadow-lg">
                          <div className="text-muted-foreground">{formatShanghaiDate(Number(label))}</div>
                          <div className="mb-1.5 font-medium tabular-nums text-foreground">
                            合计 {formatUsd(total)}
                          </div>
                          {history.series.map((item) => {
                            const value = byKey.get(item.key) ?? 0;
                            return (
                              <div key={item.key} className="space-y-0.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span style={{ color: item.color }}>{item.shortName}</span>
                                  <span className="tabular-nums text-foreground">
                                    {formatUsd(value)}{" "}
                                    <span className="text-muted-foreground">
                                      {formatShare(total > 0 ? (value / total) * 100 : 0)}
                                    </span>
                                  </span>
                                </div>
                                {item.noteZh ? (
                                  <div className="text-[10px] leading-snug text-muted-foreground">
                                    {item.noteZh}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#8b95a8", paddingTop: 8 }}
                    iconType="square"
                    iconSize={8}
                  />
                  {history.series.map((item, index) => (
                    <Bar
                      key={item.key}
                      dataKey={item.key}
                      name={item.shortName}
                      stackId="issuance"
                      fill={item.color}
                      maxBarSize={barSize}
                      radius={index === history.series.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {dimension === "issuer" ? (
            <>
              「发行量」= DefiLlama <code className="text-foreground/80">protocol.tvl[]</code> 的{" "}
              <code className="text-foreground/80">totalLiquidityUSD</code>
              ，用作代币化美股 AUM 代理，不是托管账本或 rwa.xyz 发行方 AUM。日期为各协议有观测的 UTC
              日并集；某发行方当天无点记 0，不插值。图例按最新一日市占锁定。
            </>
          ) : (
            <>
              「按股票」把同一批发行方、同一日的协议 TVL 按 tokensInUsd 拆到 TradFi ticker。每日只取最后一次观测，避免盘中快照叠到日柱上造成假跳升。现金（USDON / USDT / USDC）、Circle
              USYC 等收益稳定币、债券不进入个股段。CRCL 是 NYSE 股票代币（Ondo CRCLON、xStocks CRCLX），不是
              Circle 稳定币。未映射残余进「其他」，所以合计应与按发行方一致。
            </>
          )}{" "}
          「全部」为每周最后一次观测的存量快照（不是周加总）。
          {history.missingLiveZh.length ? ` ${history.missingLiveZh.join("；")}。` : null}
        </p>
      </CardContent>
    </Card>
  );
}
