import {
  CACHE_SECONDS,
  llamaJson,
  settled,
  type StableChainRow,
  type StableChartPoint,
  type StablesResponse,
} from "./llama";
import { isRwaXyzConfigured } from "./rwa-xyz";
import { changeFromSeries, lastDays, pctChange, usdFromPegged } from "./series";
import type { ChainStableRow, ChangeSet, KpiBlock, SeriesPoint, StablecoinRow, StablesPayload } from "./types";

const HIGHLIGHT_CHAINS = ["Ethereum", "Solana", "Tron", "Base", "Arbitrum", "Robinhood Chain"];

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

const SOURCE_ENDPOINTS = [
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

function emptyPayload(fetchedAt: string, warnings: string[], error: string | null): StablesPayload {
  return {
    ok: error == null,
    error,
    warnings,
    fetchedAt,
    timezone: "Asia/Shanghai",
    cacheSeconds: CACHE_SECONDS,
    kpis: {
      globalStables: kpi({
        key: "global-stables",
        labelZh: "全球美元稳定币流通",
        labelEn: "Global USD stablecoin circulating",
        valueUsd: null,
        footnoteZh: "DefiLlama peggedUSD 合计。",
        live: false,
      }),
      rhStables: kpi({
        key: "rh-stables",
        labelZh: "Robinhood Chain 稳定币流通",
        labelEn: "Robinhood Chain stablecoin circulating",
        valueUsd: null,
        footnoteZh: "stablecoinchains / Robinhood Chain。",
        live: false,
      }),
    },
    stables: {
      top: [],
      byChain: [],
      globalHistory: [],
      rhHistory: [],
      totalUsd: 0,
      usdtUsd: 0,
      usdtDominancePct: null,
      assetCount: 0,
    },
    sources: { endpoints: SOURCE_ENDPOINTS, rwaXyzConfigured: isRwaXyzConfigured() },
  };
}

export async function getStablesData(): Promise<StablesPayload> {
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];
  try {
    const [stables, stableChains, chartsAll, chartsRh] = await Promise.all([
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

    const globalHistory = chartToSeries(chartsAll);
    const rhHistory = chartToSeries(chartsRh);
    const pegged = stables?.peggedAssets ?? [];
    const usdPegged = pegged.filter((asset) => (asset.pegType ?? "peggedUSD") === "peggedUSD");
    const globalUsd = usdPegged.reduce((sum, asset) => sum + usdFromPegged(asset.circulating), 0);
    const top: StablecoinRow[] = usdPegged
      .map((asset) => {
        const current = usdFromPegged(asset.circulating);
        return {
          id: asset.id,
          name: asset.name,
          symbol: asset.symbol,
          circulatingUsd: current,
          sharePct: globalUsd > 0 ? (current / globalUsd) * 100 : 0,
          price: typeof asset.price === "number" && Number.isFinite(asset.price) ? asset.price : null,
          change: {
            d1: pctChange(current, usdFromPegged(asset.circulatingPrevDay)),
            d7: pctChange(current, usdFromPegged(asset.circulatingPrevWeek)),
            d30: pctChange(current, usdFromPegged(asset.circulatingPrevMonth)),
          },
          pegMechanism: asset.pegMechanism ?? null,
          pegType: asset.pegType ?? null,
          chains: asset.chains ?? [],
        };
      })
      .filter((row) => row.circulatingUsd > 0)
      .sort((a, b) => b.circulatingUsd - a.circulatingUsd)
      .slice(0, 25);

    const usdtUsd = usdFromPegged(usdPegged.find((a) => a.symbol.toUpperCase() === "USDT")?.circulating);
    const usdtDominancePct = globalUsd > 0 ? (usdtUsd / globalUsd) * 100 : null;

    const globalPrev1 = usdPegged.reduce((sum, asset) => sum + usdFromPegged(asset.circulatingPrevDay), 0);
    const globalPrev7 = usdPegged.reduce((sum, asset) => sum + usdFromPegged(asset.circulatingPrevWeek), 0);
    const globalPrev30 = usdPegged.reduce((sum, asset) => sum + usdFromPegged(asset.circulatingPrevMonth), 0);

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
    for (const row of sortedChains.slice(0, 12)) {
      byChain.push({
        name: row.name,
        circulatingUsd: row.circulatingUsd,
        sharePct: globalUsd > 0 ? (row.circulatingUsd / globalUsd) * 100 : 0,
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
        sharePct: globalUsd > 0 ? ((found?.circulatingUsd ?? 0) / globalUsd) * 100 : 0,
        highlighted: true,
        change: emptyChange(),
      });
    }
    const rhStableChange = changeFromSeries(rhHistory);
    for (const row of byChain) {
      if (row.name === "Robinhood Chain") row.change = rhStableChange;
    }

    const payload = emptyPayload(fetchedAt, warnings, null);
    payload.ok = Boolean(stables || chartsAll);
    payload.stables = {
      top,
      byChain,
      globalHistory: lastDays(globalHistory, 800),
      rhHistory,
      totalUsd: globalUsd,
      usdtUsd,
      usdtDominancePct,
      assetCount: usdPegged.filter((a) => usdFromPegged(a.circulating) > 0).length,
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
    if (!stables) warnings.push("稳定币列表不可用。");
    payload.warnings = warnings;
    if (!payload.ok) payload.error = "稳定币 DefiLlama 接口不可用。";
    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return emptyPayload(fetchedAt, warnings, message);
  }
}
