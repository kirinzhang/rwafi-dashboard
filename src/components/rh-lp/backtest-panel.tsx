"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatApr, formatPct, formatUsd } from "@/lib/format";
import type { QuoteLeg, RhLpBacktestPayload, RhLpPoolRow, RhLpWindowKey } from "@/lib/rh-lp-types";
import { BacktestChart } from "./backtest-chart";

const WINDOWS: { key: RhLpWindowKey; label: string }[] = [
  { key: "d7", label: "7天" },
  { key: "d30", label: "30天" },
  { key: "d90", label: "90天" },
];

export function BacktestPanel({
  pool,
  quote,
  windowKey,
  onWindow,
  data,
  loading,
  error,
}: {
  pool: RhLpPoolRow | null;
  quote: QuoteLeg;
  windowKey: RhLpWindowKey;
  onWindow: (key: RhLpWindowKey) => void;
  data: RhLpBacktestPayload | null;
  loading: boolean;
  error: string | null;
}) {
  const summary = data?.summary;

  return (
    <Card className="border-white/5 bg-card/80">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>费用 vs 无常损失回测</CardTitle>
            <CardDescription>
              {pool
                ? `${pool.pairLabel} · ${pool.dexLabel}${pool.feeTierPct != null ? ` · ${pool.feeTierPct}%` : " · 费率未知"}`
                : `选择上方表格中的一只 ${quote === "WETH" ? "Stock/ETH" : "Stock/USDG"} 池`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 p-1">
            {WINDOWS.map((item) => (
              <Button
                key={item.key}
                size="xs"
                variant={windowKey === item.key ? "secondary" : "ghost"}
                onClick={() => onWindow(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {!pool ? (
          <p className="py-8 text-center text-sm text-muted-foreground">尚未选择池子。</p>
        ) : loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">正在拉取日频 OHLCV…</p>
        ) : data?.insufficientHistory ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-6 text-sm">
            <div className="font-medium text-amber-100">历史不足，无法回测</div>
            <p className="mt-2 text-muted-foreground">{data.historyNoteZh ?? "没有多日成交量序列。"}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              实时 TVL {formatUsd(pool.tvlUsd)} · 24h 量 {formatUsd(pool.volume24hUsd)} · 毛估 APR{" "}
              {formatApr(pool.grossFeeAprPct)}。这些是快照，不是回测曲线。
            </p>
          </div>
        ) : (
          <>
            {data?.historyNoteZh ? (
              <p className="rounded-lg border border-amber-400/20 bg-amber-400/8 px-3 py-2 text-xs text-amber-100/90">
                {data.historyNoteZh}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="期末 LP（含费）" value={formatUsd(summary?.lpEndUsd, 3)} sub={formatPct(summary?.lpReturnPct)} />
              <Metric label="HODL 50/50" value={formatUsd(summary?.hodlEndUsd, 3)} sub={formatPct(summary?.hodlReturnPct)} />
              <Metric label="累计费用" value={formatUsd(summary?.feesUsd, 4)} sub={formatPct(summary?.feeReturnPct)} />
              <Metric
                label="IL vs HODL"
                value={formatUsd(summary?.ilVsHodlUsd, 4)}
                sub="未计费 LP − HODL"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <Badge variant="outline">起始 $2</Badge>
              <Badge variant="outline">Hold USDG {formatUsd(summary?.cashEndUsd, 2)}</Badge>
              <Badge variant="outline">
                窗口 {data?.windowActualDays ?? 0}d
                {data?.truncated ? ` / 请求 ${data.windowRequestedDays}d` : ""}
              </Badge>
              {data?.shareOfPool != null ? (
                <Badge variant="outline">份额 {(data.shareOfPool * 100).toExponential(2)}%</Badge>
              ) : null}
              <Badge variant="outline">{data?.source}</Badge>
            </div>

            <BacktestChart
              points={data?.points ?? []}
              emptyText="没有可画的序列。"
            />

            {data?.assumptionsZh.length ? (
              <ul className="list-disc space-y-1 pl-5 text-[11px] leading-relaxed text-muted-foreground">
                {data.assumptionsZh.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {sub ? <div className="text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
