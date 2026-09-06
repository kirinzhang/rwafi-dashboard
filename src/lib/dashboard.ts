import tweetSnapshot from "../../data/tweet-snapshot.json";
import { concentrationTag, herfindahlHirschmanIndex } from "./hhi";
import { loadIssuerSeeds } from "./issuers";
import {
  CACHE_SECONDS,
  llamaJson,
  settled,
  type LlamaChain,
  type ProtocolDetail,
  type ProtocolListItem,
  type StableChainRow,
  type StableChartPoint,
  type StablesResponse,
} from "./llama";
import { isRwaXyzConfigured } from "./rwa-xyz";
import {
  changeFromSeries,
  lastDays,
  mergeIssuerSeries,
  pctChange,
  usdFromPegged,
} from "./series";
import type {
  ChainStableRow,
  ChangeSet,
  DashboardPayload,
  IssuerRow,
  KpiBlock,
  SeriesPoint,
  StablecoinRow,
} from "./types";

const HIGHLIGHT_CHAINS = [
  "Ethereum",
  "Solana",
  "Tron",
  "Base",
  "Arbitrum",
  "Robinhood Chain",
];

function emptyChange(): ChangeSet {
  return { d1: null, d7: null, d30: null };
}

function kpi(partial: Omit<KpiBlock, "change"> & { change?: ChangeSet }): KpiBlock {
  return { change: emptyChange(), ...partial };
}

function chartToSeries(points: StableChartPoint[] | null): SeriesPoint[] {
  if (!points?.length) return [];
  return points
    .map((point) => {
      const date = Number(point.date);
      const value = usdFromPegged(point.totalCirculatingUSD) || usdFromPegged(point.totalCirculating);
      return { date, value };
    })
    .filter((p) => Number.isFinite(p.date) && p.date > 0 && Number.isFinite(p.value));
}

function preferChange(apiValue: number | null | undefined, computed: number | null): number | null {
  return apiValue != null && Number.isFinite(apiValue) ? apiValue : computed;
}

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
      globalStables: kpi({
        key: "global-stables",
        labelZh: "全球美元稳定币流通",
        labelEn: "Global USD stablecoin mcap",
        valueUsd: null,
        footnoteZh: "DefiLlama peggedUSD 合计。",
        live: false,
      }),
      rhStables: kpi({
        key: "rh-stables",
        labelZh: "Robinhood Chain 稳定币流通",
        labelEn: "Robinhood Chain stablecoin mcap",
        valueUsd: null,
        footnoteZh: "stablecoinchains / Robinhood Chain。",
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
    tweetSnapshot,
    stables: { top: [], byChain: [], globalHistory: [], rhHistory: [] },
    sources: {
      endpoints: SOURCE_ENDPOINTS,
      rwaXyzConfigured: isRwaXyzConfigured(),
    },
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
    noteZh: "历史 tvl[]，用于 30 日涨跌与合计曲线。",
  },
  {
    name: "DefiLlama v2/chains",
    url: "https://api.llama.fi/v2/chains",
    noteZh: "Robinhood Chain（chainId 4663）DeFi TVL，仅作上下文。",
  },
  {
    name: "DefiLlama stablecoins",
    url: "https://stablecoins.llama.fi/stablecoins?includePrices=true",
    noteZh: "各稳定币流通与 1d/7d/30d 对照。",
  },
  {
    name: "DefiLlama stablecoinchains",
    url: "https://stablecoins.llama.fi/stablecoinchains",
    noteZh: "按链拆分的稳定币流通。",
  },
  {
    name: "DefiLlama stablecoincharts/all",
    url: "https://stablecoins.llama.fi/stablecoincharts/all",
    noteZh: "全球稳定币历史。",
  },
  {
    name: "DefiLlama stablecoincharts/Robinhood Chain",
    url: "https://stablecoins.llama.fi/stablecoincharts/Robinhood%20Chain",
    noteZh: "Robinhood Chain 稳定币历史。",
  },
];

export async function getDashboardData(): Promise<DashboardPayload> {
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];

  try {
    const [protocols, chains, stables, stableChains, chartsAll, chartsRh] = await Promise.all([
      settled("protocols", llamaJson<ProtocolListItem[]>("https://api.llama.fi/protocols"), warnings),
      settled("v2/chains", llamaJson<LlamaChain[]>("https://api.llama.fi/v2/chains"), warnings),
      settled(
        "stablecoins",
        llamaJson<StablesResponse>("https://stablecoins.llama.fi/stablecoins?includePrices=true"),
        warnings,
      ),
      settled(
        "stablecoinchains",
        llamaJson<StableChainRow[]>("https://stablecoins.llama.fi/stablecoinchains"),
        warnings,
      ),
      settled(
        "stablecoincharts/all",
        llamaJson<StableChartPoint[]>("https://stablecoins.llama.fi/stablecoincharts/all"),
        warnings,
      ),
      settled(
        "stablecoincharts/Robinhood Chain",
        llamaJson<StableChartPoint[]>("https://stablecoins.llama.fi/stablecoincharts/Robinhood%20Chain"),
        warnings,
      ),
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
      const tvlUsd =
        listed?.tvl ??
        (history.length ? history[history.length - 1].value : null);
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
    const equityHistory = lastDays(
      mergeIssuerSeries(
        details.map(({ seed, detail }) => ({
          slug: seed.slug,
          points: (detail?.tvl ?? []).map((p) => ({
            date: p.date,
            value: p.totalLiquidityUSD,
          })),
        })),
      ),
      400,
    );

    const globalHistory = chartToSeries(chartsAll);
    const rhHistory = chartToSeries(chartsRh);

    const pegged = stables?.peggedAssets ?? [];
    const top: StablecoinRow[] = pegged
      .map((asset) => {
        const current = usdFromPegged(asset.circulating);
        return {
          id: asset.id,
          name: asset.name,
          symbol: asset.symbol,
          circulatingUsd: current,
          change: {
            d1: pctChange(current, usdFromPegged(asset.circulatingPrevDay)),
            d7: pctChange(current, usdFromPegged(asset.circulatingPrevWeek)),
            d30: pctChange(current, usdFromPegged(asset.circulatingPrevMonth)),
          },
          pegMechanism: asset.pegMechanism ?? null,
          chains: asset.chains ?? [],
        };
      })
      .filter((row) => row.circulatingUsd > 0)
      .sort((a, b) => b.circulatingUsd - a.circulatingUsd)
      .slice(0, 12);

    const globalUsd = pegged.reduce((sum, asset) => sum + usdFromPegged(asset.circulating), 0);
    const globalPrev1 = pegged.reduce((sum, asset) => sum + usdFromPegged(asset.circulatingPrevDay), 0);
    const globalPrev7 = pegged.reduce((sum, asset) => sum + usdFromPegged(asset.circulatingPrevWeek), 0);
    const globalPrev30 = pegged.reduce(
      (sum, asset) => sum + usdFromPegged(asset.circulatingPrevMonth),
      0,
    );

    const chainRowsRaw = (stableChains ?? []).map((row) => ({
      name: row.name,
      circulatingUsd: usdFromPegged(row.totalCirculatingUSD),
    }));
    const rhStableUsd =
      chainRowsRaw.find((c) => c.name === "Robinhood Chain")?.circulatingUsd ??
      (rhHistory.length ? rhHistory[rhHistory.length - 1].value : null);

    const highlighted = new Set(HIGHLIGHT_CHAINS);
    const byChain: ChainStableRow[] = [];
    const sortedChains = [...chainRowsRaw].sort((a, b) => b.circulatingUsd - a.circulatingUsd);
    const seen = new Set<string>();
    for (const row of sortedChains.slice(0, 10)) {
      byChain.push({
        name: row.name,
        circulatingUsd: row.circulatingUsd,
        highlighted: highlighted.has(row.name),
        change: emptyChange(),
      });
      seen.add(row.name);
    }
    for (const name of HIGHLIGHT_CHAINS) {
      if (seen.has(name)) continue;
      const found = chainRowsRaw.find((c) => c.name === name);
      byChain.push({
        name,
        circulatingUsd: found?.circulatingUsd ?? 0,
        highlighted: true,
        change: emptyChange(),
      });
    }

    // Approximate 1d/7d/30d for highlighted chains from global RH history only for RH;
    // other chains don't have per-chain history in this MVP.
    const rhStableChange = changeFromSeries(rhHistory);
    for (const row of byChain) {
      if (row.name === "Robinhood Chain") row.change = rhStableChange;
    }

    const rhChain = (chains ?? []).find(
      (c) => c.name === "Robinhood Chain" || c.chainId === 4663,
    );
    const equityChange = changeFromSeries(equityHistory);

    const payload = emptyPayload(fetchedAt, warnings, null);
    payload.ok = true;
    payload.issuers = issuerRows;
    payload.equityTotalUsd = equityTotalUsd;
    payload.equityHhi = equityHhi;
    payload.equityConcentrationZh = concentration.zh;
    payload.equityConcentrationEn = concentration.en;
    payload.equityHistory = equityHistory;
    payload.stables = {
      top,
      byChain,
      globalHistory: lastDays(globalHistory, 800),
      rhHistory,
    };
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
      footnoteZh: `免费接口没有 Robinhood / RH Chain 股权账本。推文快照（2026-09-06，非实时）：${tweetSnapshot.rows.find((r) => r.name === "Robinhood") ? "$149.42M / 5.1%" : "—"}。`,
      live: false,
    };
    payload.kpis.globalStables = {
      key: "global-stables",
      labelZh: "全球美元稳定币流通",
      labelEn: "Global USD stablecoin circulating",
      valueUsd: globalUsd || (globalHistory.at(-1)?.value ?? null),
      change: {
        d1: pctChange(globalUsd, globalPrev1),
        d7: pctChange(globalUsd, globalPrev7),
        d30: pctChange(globalUsd, globalPrev30),
      },
      footnoteZh: "DefiLlama peggedUSD 流通合计（不含欧元等非美元稳定币）。",
      live: globalUsd > 0,
    };
    payload.kpis.rhStables = {
      key: "rh-stables",
      labelZh: "Robinhood Chain 稳定币流通",
      labelEn: "Robinhood Chain stablecoin circulating",
      valueUsd: rhStableUsd,
      change: rhStableChange,
      footnoteZh: "DefiLlama stablecoinchains → Robinhood Chain（peggedUSD）。",
      live: rhStableUsd != null && rhStableUsd > 0,
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
    if (!stables) warnings.push("稳定币列表不可用。");

    payload.warnings = warnings;
    payload.ok = Boolean(protocols || stables);
    if (!payload.ok) payload.error = "核心 DefiLlama 接口均不可用。";
    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return emptyPayload(fetchedAt, warnings, message);
  }
}
