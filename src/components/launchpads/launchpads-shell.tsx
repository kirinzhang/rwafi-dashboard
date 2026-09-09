"use client";

import { SiteHeader } from "@/components/dashboard/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LaunchpadsPayload, RangeKey } from "@/lib/launchpad-types";
import { RANGE_OPTIONS } from "@/lib/launchpad-types";
import { useCallback, useEffect, useState } from "react";
import { LaunchpadCardView } from "./launchpad-card";

const REFRESH_MS = 5 * 60 * 1000;

export function LaunchpadsShell({ initialData }: { initialData: LaunchpadsPayload }) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("d30");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/launchpads", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = (await response.json()) as LaunchpadsPayload;
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

  const defaultChain = data.chains[0]?.id ?? "robinhood";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Tabs defaultValue={defaultChain} className="gap-6">
        <SiteHeader
          title="发射台看板"
          subtitle="RH：Pons、Long.xyz · Solana：stonk.fun、pump.fun · BSC：four.meme、Flap.sh。日频柱状图按 30/60/90 天窗口加总。对照用，不是投资建议。"
          fetchedAt={data.fetchedAt}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList variant="line" className="w-full max-w-xl">
              {data.chains.map((chain) => (
                <TabsTrigger key={chain.id} value={chain.id} className="gap-2">
                  <span className="size-2 rounded-full" style={{ background: chain.color }} />
                  {chain.shortName}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">窗口</span>
              <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 p-1">
                {RANGE_OPTIONS.map((item) => (
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
            </div>
          </div>
        </SiteHeader>

        {clientError || data.error ? (
          <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            数据拉取异常：{clientError ?? data.error}
          </div>
        ) : null}

        {data.chains.map((chain) => (
          <TabsContent key={chain.id} value={chain.id} className="mt-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: chain.color }} />
              <h2 className="text-lg font-semibold">{chain.name}</h2>
              <Badge variant="outline">{chain.launchpads.length} 个发射台</Badge>
              <span className="text-xs text-muted-foreground">
                {RANGE_OPTIONS.find((item) => item.key === range)?.label}合计来自 DefiLlama 日频图
              </span>
            </div>
            {chain.launchpads.length === 0 ? (
              <p className="text-sm text-muted-foreground">该链暂无配置或数据失败。</p>
            ) : (
              chain.launchpads.map((pad) => <LaunchpadCardView key={pad.id} pad={pad} range={range} />)
            )}
          </TabsContent>
        ))}
      </Tabs>

      {data.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-xs text-amber-100/90">
          {data.warnings.join(" · ")}
        </div>
      ) : null}

      <footer className="space-y-3 border-t border-white/8 pt-6 pb-4 text-sm text-muted-foreground">
        <h2 className="text-foreground">方法与数据源</h2>
        <p>
          实时路径优先 DefiLlama 免费 fees / dexs 接口（无需 API Key）。30 / 60 / 90
          天指标由 <code className="text-foreground">totalDataChart</code> 与链拆分日频加总；窗口不足时显示
          — 并说明原因，不会外推。GeckoTerminal 只用于 Top5 池样本。Dune 看板列为对照链接
          {data.duneConfigured ? "（已配置 DUNE_API_KEY，但本页尚未执行付费查询）" : "（未配置 DUNE_API_KEY）"}
          ，不会把看板截图数字当成实时值。
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.sources.map((item) => (
            <li key={item.url} className="rounded-lg border border-white/5 p-3 text-xs">
              <a href={item.url} className="text-sky-300 hover:underline" target="_blank" rel="noreferrer">
                {item.name}
              </a>
              <p className="mt-1">{item.noteZh}</p>
            </li>
          ))}
        </ul>
        <div>
          <div className="mb-2 text-foreground">Dune 对照看板</div>
          <ul className="space-y-1 text-xs">
            {data.duneBoards.map((board) => (
              <li key={board.url}>
                <a href={board.url} className="text-sky-300 hover:underline" target="_blank" rel="noreferrer">
                  {board.title}
                </a>
                <span className="text-muted-foreground"> — {board.noteZh}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs">本页研究工具，不构成投资建议。缺失指标显示为 — 并说明原因，不会编造数字。</p>
      </footer>
    </div>
  );
}
