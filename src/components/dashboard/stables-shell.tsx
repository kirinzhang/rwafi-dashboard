"use client";

import type { StablesPayload } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import { MethodologyFooter } from "./methodology-footer";
import { SiteHeader } from "./site-header";
import { StablecoinSection } from "./stablecoin-section";

const REFRESH_MS = 5 * 60 * 1000;

export function StablesShell({ initialData }: { initialData: StablesPayload }) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/stablecoins", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = (await response.json()) as StablesPayload;
      setData(next);
      setClientError(next.error);
    } catch (error) {
      setClientError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader
        title="稳定币"
        subtitle="美元稳定币流通市值、按币种与按链拆分。布局参考 DefiLlama Stablecoins；数据仍是 stablecoins.llama.fi。Robinhood Chain 是链上稳定币上下文，不是代币化美股 AUM。"
        fetchedAt={data.fetchedAt}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
      />

      {clientError || data.error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          数据拉取异常：{clientError ?? data.error}。下方可能是上次成功的缓存或空状态。
        </div>
      ) : null}

      {data.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-xs text-amber-100/90">
          部分接口失败：{data.warnings.join(" · ")}
        </div>
      ) : null}

      <StablecoinSection data={data.stables} kpis={data.kpis} />
      <MethodologyFooter sources={data.sources} fetchedAt={data.fetchedAt} variant="stables" />
    </div>
  );
}
