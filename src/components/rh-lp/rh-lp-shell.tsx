"use client";

import { SiteHeader } from "@/components/dashboard/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import type { QuoteLeg, RhLpBacktestPayload, RhLpPayload, RhLpPoolRow, RhLpWindowKey } from "@/lib/rh-lp-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BacktestPanel } from "./backtest-panel";
import { PoolTable } from "./pool-table";
import { RhLpMethodology } from "./rh-lp-methodology";

const REFRESH_MS = 5 * 60 * 1000;

export function RhLpShell({ initialData }: { initialData: RhLpPayload }) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteLeg>("USDG");
  const [windowKey, setWindowKey] = useState<RhLpWindowKey>("d30");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backtest, setBacktest] = useState<RhLpBacktestPayload | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestError, setBacktestError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/rh-lp", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = (await response.json()) as RhLpPayload;
      setData(next);
      setClientError(next.error);
    } catch (error) {
      setClientError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const visiblePools = useMemo(
    () => data.pools.filter((p) => p.quote === quote),
    [data.pools, quote],
  );

  const selected: RhLpPoolRow | null = useMemo(() => {
    if (selectedId) {
      const match = visiblePools.find((p) => p.id === selectedId);
      if (match) return match;
    }
    return visiblePools[0] ?? null;
  }, [selectedId, visiblePools]);

  useEffect(() => {
    if (!selected) {
      setBacktest(null);
      return;
    }
    let cancelled = false;
    setBacktestLoading(true);
    setBacktestError(null);
    const qs = new URLSearchParams({ pair: selected.pairAddress, window: windowKey });
    void fetch(`/api/rh-lp/backtest?${qs}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as RhLpBacktestPayload;
        if (cancelled) return;
        if (!response.ok && payload.error) {
          setBacktestError(payload.error);
          setBacktest(payload);
          return;
        }
        setBacktest(payload);
        if (payload.error) setBacktestError(payload.error);
      })
      .catch((error) => {
        if (!cancelled) setBacktestError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setBacktestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.pairAddress, windowKey, selected]);

  const kpis = [data.kpis.poolCount, data.kpis.tvl, data.kpis.volume24h, data.kpis.deepest];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader
        title="RH Stock LP 监控"
        subtitle="官方 Robinhood Stock Token 对 USDG / ETH（WETH）的深度池：TVL、成交、毛估手续费 APR，以及满档费用 vs 无常损失回测。策略是 LP 股票代币本身，而不是 paired meme。"
        fetchedAt={data.fetchedAt}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
      />

      {clientError || data.error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          数据拉取异常：{clientError ?? data.error}。
        </div>
      ) : null}

      {data.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-xs text-amber-100/90">
          部分接口失败：{data.warnings.join(" · ")}
        </div>
      ) : null}

      <aside className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-4 sm:px-6">
        <p className="text-[11px] font-medium tracking-wide text-emerald-300 uppercase">论点条 · Thesis</p>
        <p className="mt-2 max-w-5xl text-sm leading-relaxed text-foreground/90">
          股票 meme 在 Robinhood Chain 上发热时，更稳的 LP 腿是<strong>官方 Stock Token × USDG 或 WETH</strong>
          ，而不是 meme 本身。ChainId <code className="rounded bg-white/10 px-1">4663</code>
          。WETH 在表里标成 ETH。数字是研究对照，<strong>不是投资建议</strong>。
        </p>
      </aside>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <Card key={item.key} className="border-white/5 bg-card/80 backdrop-blur">
            <CardHeader className="gap-2">
              <CardTitle className="text-[13px] leading-snug text-muted-foreground">{item.labelZh}</CardTitle>
              <div className="text-[11px] text-muted-foreground/80">{item.labelEn}</div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {item.valueText ?? formatUsd(item.valueUsd)}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{item.footnoteZh}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {data.missingOfficial.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {data.missingOfficial.map((row) => (
            <Badge key={row.symbol} variant="outline" className="h-auto max-w-xl whitespace-normal py-1 text-[11px]">
              {row.symbol}：{row.noteZh}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">报价腿</span>
        <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 p-1">
          <Button
            size="xs"
            variant={quote === "USDG" ? "secondary" : "ghost"}
            onClick={() => {
              setQuote("USDG");
              setSelectedId(null);
            }}
          >
            Stock / USDG
          </Button>
          <Button
            size="xs"
            variant={quote === "WETH" ? "secondary" : "ghost"}
            onClick={() => {
              setQuote("WETH");
              setSelectedId(null);
            }}
          >
            Stock / ETH
          </Button>
        </div>
      </div>

      <PoolTable
        pools={data.pools}
        quote={quote}
        selectedId={selected?.id ?? null}
        onSelect={(row) => setSelectedId(row.id)}
      />

      <BacktestPanel
        pool={selected}
        quote={quote}
        windowKey={windowKey}
        onWindow={setWindowKey}
        data={backtest}
        loading={backtestLoading}
        error={backtestError}
      />

      <RhLpMethodology sources={data.sources} fetchedAt={data.fetchedAt} notesZh={data.dataNotesZh} />
    </div>
  );
}
