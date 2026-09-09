"use client";

import type { DashboardPayload } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import { HeroKpis } from "./hero-kpis";
import { IssuerShareCard } from "./issuer-share-card";
import { IssuanceStackChart } from "./issuance-stack-chart";
import { MethodologyFooter } from "./methodology-footer";
import { PlatformsTable } from "./platforms-table";
import { SiteHeader } from "./site-header";
import { StablecoinSection } from "./stablecoin-section";
import { ThesisStrip } from "./thesis-strip";
import { TweetSnapshotCard } from "./tweet-snapshot-card";

const REFRESH_MS = 5 * 60 * 1000;

export function DashboardShell({ initialData }: { initialData: DashboardPayload }) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = (await response.json()) as DashboardPayload;
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

  const kpis = [
    data.kpis.equityAum,
    data.kpis.robinhoodEquity,
    data.kpis.globalStables,
    data.kpis.rhStables,
    data.kpis.rhChainTvl,
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader
        title="代币化美股 & 稳定币看板"
        subtitle="追踪代币化美股协议 TVL 与稳定币发行。Robinhood Chain 夏天看股权代币 AUM，而不是发射台市值。"
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

      <ThesisStrip />
      <HeroKpis items={kpis} />

      <IssuanceStackChart
        history={
          data.equityIssuanceStack ?? {
            yAxisZh: "DefiLlama 协议 TVL（USD）",
            yAxisEn: "DefiLlama protocol TVL (USD)",
            rankingRuleZh: "",
            missingLiveZh: [],
            series: [],
            points: [],
          }
        }
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <IssuerShareCard
          issuers={data.issuers}
          totalUsd={data.equityTotalUsd}
          hhi={data.equityHhi}
          concentrationZh={data.equityConcentrationZh}
          concentrationEn={data.equityConcentrationEn}
        />
        <TweetSnapshotCard snapshot={data.tweetSnapshot} />
      </div>

      <PlatformsTable issuers={data.issuers} />
      <StablecoinSection data={data.stables} />
      <MethodologyFooter sources={data.sources} fetchedAt={data.fetchedAt} />
    </div>
  );
}
