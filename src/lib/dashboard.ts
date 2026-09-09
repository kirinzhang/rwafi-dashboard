import tweetSnapshot from "../../data/tweet-snapshot.json";
import { concentrationTag, herfindahlHirschmanIndex } from "./hhi";
import { loadIssuerSeeds } from "./issuers";
import { CACHE_SECONDS, llamaJson, settled, type LlamaChain, type ProtocolDetail, type ProtocolListItem } from "./llama";
import { isRwaXyzConfigured } from "./rwa-xyz";
import { buildStackedIssuance, changeFromSeries, lastDays, mergeIssuerSeries } from "./series";
import {
  collectTickerSeries,
  TICKER_NOTES,
  TICKER_RANKING_RULE_ZH,
  TICKER_Y_AXIS_EN,
  TICKER_Y_AXIS_ZH,
  UNMAPPED_TICKER_SLUG,
} from "./tickers";
import type { ChangeSet, DashboardPayload, IssuerRow, KpiBlock, SeriesPoint, StackedIssuanceHistory } from "./types";

function emptyChange(): ChangeSet {
  return { d1: null, d7: null, d30: null };
}

function kpi(partial: Omit<KpiBlock, "change"> & { change?: ChangeSet }): KpiBlock {
  return { change: emptyChange(), ...partial };
}

function preferChange(apiValue: number | null | undefined, computed: number | null): number | null {
  return apiValue != null && Number.isFinite(apiValue) ? apiValue : computed;
}

function emptyStack(partial: Pick<StackedIssuanceHistory, "yAxisZh" | "yAxisEn">): StackedIssuanceHistory {
  return {
    ...partial,
    rankingRuleZh: "",
    missingLiveZh: [],
    series: [],
    points: [],
  };
}

const SOURCE_ENDPOINTS = [
  {
    name: "DefiLlama protocols",
    url: "https://api.llama.fi/protocols",
    noteZh: "协议列表：当前 TVL、1d/7d 涨跌、分类与链。",
  },
  {
    name: "DefiLlama protocol/{slug}",
    url: "https://api.llama.fi/protocol/{slug}",
    noteZh: "同一 JSON 含历史 tvl[]（发行方堆叠）与 tokensInUsd[]（按标的股票堆叠）。",
  },
  {
    name: "DefiLlama v2/chains",
    url: "https://api.llama.fi/v2/chains",
    noteZh: "Robinhood Chain（chainId 4663）DeFi TVL，仅作上下文，不是股权 AUM。",
  },
];

function emptyPayload(fetchedAt: string, warnings: string[], error: string | null): DashboardPayload {
  return {
    ok: error == null,
    error,
    warnings,
    fetchedAt,
    timezone: "Asia/Shanghai",
    cacheSeconds: CACHE_SECONDS,
    kpis: {
      equityAum: kpi({
        key: "equity-aum",
        labelZh: "代币化美股 AUM（追踪合计）",
        labelEn: "Tracked tokenized equity AUM",
        valueUsd: null,
        footnoteZh: "DefiLlama 协议 TVL 合计，不是 rwa.xyz 发行方 AUM。",
        live: false,
      }),
      robinhoodEquity: kpi({
        key: "rh-equity",
        labelZh: "Robinhood 代币化美股 AUM",
        labelEn: "Robinhood tokenized equity AUM",
        valueUsd: null,
        footnoteZh: "免费接口暂无 Robinhood 股权账本。",
        live: false,
      }),
      rhChainTvl: kpi({
        key: "rh-chain-tvl",
        labelZh: "Robinhood Chain DeFi TVL",
        labelEn: "Robinhood Chain DeFi TVL",
        valueUsd: null,
        footnoteZh: "链上 DeFi TVL，不是股权代币 AUM。",
        live: false,
        proxy: true,
      }),
    },
    issuers: [],
    equityTotalUsd: 0,
    equityHhi: 0,
    equityConcentrationZh: "—",
    equityConcentrationEn: "—",
    equityHistory: [],
    equityIssuanceStack: emptyStack({
      yAxisZh: "DefiLlama 协议 TVL（USD）",
      yAxisEn: "DefiLlama protocol TVL (USD)",
    }),
    tickerIssuanceStack: emptyStack({
      yAxisZh: TICKER_Y_AXIS_ZH,
      yAxisEn: TICKER_Y_AXIS_EN,
    }),
    tweetSnapshot,
    sources: {
      endpoints: SOURCE_ENDPOINTS,
      rwaXyzConfigured: isRwaXyzConfigured(),
    },
  };
}

export async function getDashboardData(): Promise<DashboardPayload> {
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];

  try {
    const [protocols, chains] = await Promise.all([
      settled("protocols", llamaJson<ProtocolListItem[]>("https://api.llama.fi/protocols"), warnings),
      settled("v2/chains", llamaJson<LlamaChain[]>("https://api.llama.fi/v2/chains"), warnings),
    ]);

    const protocolList = protocols ?? [];
    const bySlug = new Map(protocolList.map((p) => [p.slug, p]));
    const seeds = loadIssuerSeeds(protocolList);

    const details = await Promise.all(
      seeds.map(async (seed) => {
        const detail = await settled(
          `protocol/${seed.slug}`,
          llamaJson<ProtocolDetail>(`https://api.llama.fi/protocol/${seed.slug}`),
          warnings,
        );
        return { seed, detail };
      }),
    );

    const issuerRows: IssuerRow[] = details.map(({ seed, detail }) => {
      const listed = bySlug.get(seed.slug);
      const history: SeriesPoint[] = (detail?.tvl ?? []).map((p) => ({
        date: p.date,
        value: p.totalLiquidityUSD,
      }));
      const computed = changeFromSeries(history);
      const tvlUsd = listed?.tvl ?? (history.length ? history[history.length - 1].value : null);
      const lastUpdated = history.length
        ? new Date(history[history.length - 1].date * 1000).toISOString()
        : fetchedAt;
      const chainsFromDetail = Object.entries(detail?.currentChainTvls ?? {})
        .filter(([, v]) => Number(v) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .map(([name]) => name);
      return {
        slug: seed.slug,
        displayName: seed.displayName,
        shortName: seed.shortName,
        color: seed.color,
        featured: seed.featured,
        noteZh: seed.noteZh,
        tvlUsd: tvlUsd != null && Number.isFinite(tvlUsd) ? tvlUsd : null,
        sharePct: null,
        chains: chainsFromDetail.length ? chainsFromDetail : listed?.chains ?? [],
        change: {
          d1: preferChange(listed?.change_1d, computed.d1),
          d7: preferChange(listed?.change_7d, computed.d7),
          d30: preferChange(listed?.change_1m, computed.d30),
        },
        projectUrl: listed?.url ?? detail?.url ?? null,
        defillamaUrl: `https://defillama.com/protocol/${seed.slug}`,
        logoUrl: listed?.logo ?? `https://icons.llamao.fi/icons/protocols/${seed.slug}`,
        lastUpdated,
        sourceLabel: "DefiLlama protocol TVL",
        discovered: Boolean(seed.discovered),
      };
    });

    issuerRows.sort((a, b) => (b.tvlUsd ?? -1) - (a.tvlUsd ?? -1));
    const liveValues = issuerRows.map((row) => row.tvlUsd ?? 0);
    const equityTotalUsd = liveValues.reduce((sum, v) => sum + Math.max(v, 0), 0);
    for (const row of issuerRows) {
      row.sharePct =
        equityTotalUsd > 0 && row.tvlUsd != null && row.tvlUsd > 0
          ? (row.tvlUsd / equityTotalUsd) * 100
          : row.tvlUsd == null
            ? null
            : 0;
    }

    const equityHhi = herfindahlHirschmanIndex(liveValues);
    const concentration = concentrationTag(equityHhi);
    const perIssuerHistory = details.map(({ seed, detail }) => ({
      slug: seed.slug,
      displayName: seed.displayName,
      shortName: seed.shortName,
      color: seed.color,
      points: (detail?.tvl ?? []).map((p) => ({
        date: p.date,
        value: p.totalLiquidityUSD,
      })),
    }));
    const stacked = buildStackedIssuance(perIssuerHistory, 10);
    const missingLiveZh = [
      ...perIssuerHistory
        .filter((item) => !item.points.some((p) => p.value > 0))
        .map((item) => `${item.displayName}（${item.slug}）：DefiLlama 无可用 tvl[]`),
      "Robinhood / Binance / Reality / Backpack：无免费历史序列，只出现在推文快照",
    ];
    const equityHistory = lastDays(mergeIssuerSeries(perIssuerHistory), 400);
    const equityIssuanceStack: StackedIssuanceHistory = {
      yAxisZh: "DefiLlama 协议 TVL（USD）",
      yAxisEn: "DefiLlama protocol TVL (USD)",
      rankingRuleZh:
        "Top 10 按对齐后最新交易日的协议 TVL 市占一次性固定，全图沿用同一图例与颜色；其余合并为「其他」。缺测日记 0，不前向填充。",
      missingLiveZh,
      series: stacked.series,
      points: lastDays(stacked.points, 800),
    };

    const tickerCollected = collectTickerSeries(
      details.map(({ seed, detail }) => ({
        slug: seed.slug,
        displayName: seed.displayName,
        detail,
      })),
    );
    const tickerStacked = buildStackedIssuance(tickerCollected.series, 10, {
      alwaysOther: [UNMAPPED_TICKER_SLUG],
    });
    const tickerIssuanceStack: StackedIssuanceHistory = {
      yAxisZh: TICKER_Y_AXIS_ZH,
      yAxisEn: TICKER_Y_AXIS_EN,
      rankingRuleZh: TICKER_RANKING_RULE_ZH,
      missingLiveZh: tickerCollected.notesZh,
      series: tickerStacked.series.map((item) => ({
        ...item,
        noteZh: TICKER_NOTES[item.key],
      })),
      points: lastDays(tickerStacked.points, 800),
    };
    const rhChain = (chains ?? []).find((c) => c.name === "Robinhood Chain" || c.chainId === 4663);
    const equityChange = changeFromSeries(equityHistory);
    const rhTweet = tweetSnapshot.rows.find((r) => r.name === "Robinhood");

    const payload = emptyPayload(fetchedAt, warnings, null);
    payload.ok = Boolean(protocols);
    payload.issuers = issuerRows;
    payload.equityTotalUsd = equityTotalUsd;
    payload.equityHhi = equityHhi;
    payload.equityConcentrationZh = concentration.zh;
    payload.equityConcentrationEn = concentration.en;
    payload.equityHistory = equityHistory;
    payload.equityIssuanceStack = equityIssuanceStack;
    payload.tickerIssuanceStack = tickerIssuanceStack;
    payload.kpis.equityAum = {
      key: "equity-aum",
      labelZh: "代币化美股 AUM（追踪合计）",
      labelEn: "Tracked tokenized equity AUM",
      valueUsd: equityTotalUsd > 0 ? equityTotalUsd : null,
      change: equityChange,
      footnoteZh: `DefiLlama 协议 TVL 合计（${issuerRows.filter((i) => (i.tvlUsd ?? 0) > 0).length} 个有数据的发行方）。≠ rwa.xyz 发行方 AUM。`,
      live: equityTotalUsd > 0,
    };
    payload.kpis.robinhoodEquity = {
      key: "rh-equity",
      labelZh: "Robinhood 代币化美股 AUM",
      labelEn: "Robinhood tokenized equity AUM",
      valueUsd: null,
      change: emptyChange(),
      footnoteZh: `免费接口没有 Robinhood / RH Chain 股权账本。推文快照（2026-09-06，非实时）：${rhTweet ? "$149.42M / 5.1%" : "—"}。`,
      live: false,
    };
    payload.kpis.rhChainTvl = {
      key: "rh-chain-tvl",
      labelZh: "Robinhood Chain DeFi TVL",
      labelEn: "Robinhood Chain DeFi TVL",
      valueUsd: rhChain?.tvl ?? null,
      change: emptyChange(),
      footnoteZh: "api.llama.fi/v2/chains · chainId 4663。这是链上 DeFi TVL，不是代币化美股 AUM。",
      live: rhChain?.tvl != null,
      proxy: true,
    };

    if (!protocols) warnings.push("协议列表不可用，股权 AUM 可能缺失。");
    payload.warnings = warnings;
    if (!payload.ok) payload.error = "核心 DefiLlama 协议接口不可用。";
    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return emptyPayload(fetchedAt, warnings, message);
  }
}
