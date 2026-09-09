import seed from "../../data/launchpads.json";
import { llamaJson, settled } from "./llama";
import type {
  DailyPoint,
  LaunchpadCard,
  LaunchpadToken,
  LaunchpadsPayload,
  WindowMetric,
} from "./launchpad-types";
import {
  buildWindowMetric,
  emptyMetric,
  mergeDaily,
  residualSeries,
} from "./launchpad-windows";

const CACHE = 600;

type LlamaSummary = {
  name?: string;
  slug?: string;
  total24h?: number | null;
  total7d?: number | null;
  total30d?: number | null;
  chains?: string[];
  methodology?: Record<string, string> | string | null;
  methodologyURL?: string | null;
  totalDataChart?: [number, number][] | null;
  totalDataChartBreakdown?: [number, Record<string, Record<string, number>>][] | null;
  chainBreakdown?: Record<
    string,
    { total24h?: number | null; total7d?: number | null; total30d?: number | null }
  > | null;
};

type GeckoPool = {
  id: string;
  attributes?: {
    name?: string;
    address?: string;
    fdv_usd?: string | number | null;
    market_cap_usd?: string | number | null;
    volume_usd?: { h24?: string | number | null };
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
  };
};

type GeckoToken = {
  id: string;
  attributes?: {
    name?: string;
    symbol?: string;
    address?: string;
  };
};

type LaunchpadSeed = (typeof seed.launchpads)[number];

const CHAIN_LABEL: Record<string, string> = {
  robinhood: "Robinhood Chain",
  solana: "Solana",
  bsc: "BSC",
};

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function methodologyText(raw: LlamaSummary["methodology"] | undefined): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  const fees = raw.Fees;
  const revenue = raw.Revenue;
  const supply = raw.SupplySideRevenue;
  const parts = [
    fees ? `毛手续费：${fees}` : null,
    revenue ? `协议收入：${revenue}` : null,
    supply ? `创作者/供给侧：${supply}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

function native30(row: LlamaSummary | null | undefined, chainKey?: string): number | null {
  if (!row) return null;
  const label = chainKey ? CHAIN_LABEL[chainKey] : undefined;
  const slice = label ? row.chainBreakdown?.[label] : undefined;
  if (slice) return num(slice.total30d);
  return num(row.total30d);
}

function dailyFromSummary(row: LlamaSummary | null | undefined, chainKey?: string): DailyPoint[] {
  if (!row) return [];
  const label = chainKey ? CHAIN_LABEL[chainKey] : undefined;
  const breakdown = row.totalDataChartBreakdown;
  if (label && Array.isArray(breakdown) && breakdown.length) {
    const hasChain = breakdown.some(([, chains]) => chains && label in chains);
    if (hasChain) {
      return breakdown.map(([t, chains]) => {
        const inner = chains?.[label];
        const v = inner
          ? Object.values(inner).reduce((sum, item) => sum + (typeof item === "number" ? item : 0), 0)
          : 0;
        return { t, v };
      });
    }
  }
  const chart = row.totalDataChart;
  if (!Array.isArray(chart)) return [];
  return chart
    .filter((row) => Array.isArray(row) && row.length >= 2)
    .map(([t, v]) => ({ t, v: typeof v === "number" && Number.isFinite(v) ? v : 0 }));
}

function metricFromSlugs(
  slugs: string[],
  summaries: Map<string, LlamaSummary>,
  chainKey: string,
  emptyReason: string,
): WindowMetric {
  if (!slugs.length) return emptyMetric(emptyReason);
  const series = mergeDaily(slugs.map((slug) => dailyFromSummary(summaries.get(slug), chainKey)));
  const native = slugs.reduce<number | null>((acc, slug) => {
    const value = native30(summaries.get(slug), chainKey);
    if (value == null) return acc;
    return (acc ?? 0) + value;
  }, null);
  if (!series.length && native == null) return emptyMetric(emptyReason);
  return buildWindowMetric(series, native);
}

async function geckoPools(
  network: string,
  dex: string,
  warnings: string[],
): Promise<{ pools: GeckoPool[]; tokens: Map<string, GeckoToken> }> {
  const url = `https://api.geckoterminal.com/api/v2/networks/${network}/dexes/${dex}/pools?page=1&include=base_token`;
  const json = await settled(
    `geckoterminal ${network}/${dex}`,
    (async () => {
      const response = await fetch(url, {
        next: { revalidate: CACHE },
        headers: {
          Accept: "application/json",
          "User-Agent": "EquityTokenRadar/1.0 (research dashboard)",
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
      return response.json() as Promise<{ data?: GeckoPool[]; included?: GeckoToken[] }>;
    })(),
    warnings,
  );
  const tokens = new Map<string, GeckoToken>();
  for (const token of json?.included ?? []) {
    if (token.id) tokens.set(token.id, token);
  }
  return { pools: json?.data ?? [], tokens };
}

function tokensFromPools(
  batches: { network: string; pools: GeckoPool[]; tokens: Map<string, GeckoToken> }[],
): LaunchpadToken[] {
  const bySymbol = new Map<string, LaunchpadToken>();
  for (const batch of batches) {
    for (const pool of batch.pools) {
      const at = pool.attributes ?? {};
      const tokenId = pool.relationships?.base_token?.data?.id;
      const token = tokenId ? batch.tokens.get(tokenId) : undefined;
      const name = token?.attributes?.name || (at.name ?? "").split(" / ")[0] || "Unknown";
      const symbol = token?.attributes?.symbol || name;
      const fdv = num(at.fdv_usd);
      const mcap = num(at.market_cap_usd);
      const rank = mcap && mcap > 0 ? mcap : fdv;
      if (rank == null || rank <= 0) continue;
      const key = `${batch.network}:${(token?.attributes?.address || at.address || name).toLowerCase()}`;
      const next: LaunchpadToken = {
        name,
        symbol,
        mcapUsd: mcap && mcap > 0 ? mcap : null,
        fdvUsd: fdv,
        volume24h: num(at.volume_usd?.h24),
        network: batch.network,
        poolAddress: at.address ?? "",
        url: at.address
          ? `https://www.geckoterminal.com/${batch.network}/pools/${at.address}`
          : `https://www.geckoterminal.com/${batch.network}`,
      };
      const prev = bySymbol.get(key);
      const prevRank = prev ? (prev.mcapUsd ?? prev.fdvUsd ?? 0) : 0;
      if (!prev || rank > prevRank) bySymbol.set(key, next);
    }
  }
  return [...bySymbol.values()]
    .sort((a, b) => (b.mcapUsd ?? b.fdvUsd ?? 0) - (a.mcapUsd ?? a.fdvUsd ?? 0))
    .slice(0, 5);
}

function buildCard(
  pad: LaunchpadSeed,
  feeSummaries: Map<string, LlamaSummary>,
  revenueSummaries: Map<string, LlamaSummary>,
  volumeSummaries: Map<string, LlamaSummary>,
): LaunchpadCard {
  const methodologies: string[] = [];
  for (const slug of pad.feeSlugs) {
    const text = methodologyText(feeSummaries.get(slug)?.methodology);
    if (text) methodologies.push(`${slug}: ${text}`);
  }

  const grossFees = metricFromSlugs(
    pad.feeSlugs,
    feeSummaries,
    pad.volumeChainKey,
    pad.feeSlugs.length ? "DefiLlama fees 日频图不可用。" : "未配置 fees slug。",
  );
  const protocolRevenue = metricFromSlugs(
    pad.feeSlugs,
    revenueSummaries,
    pad.volumeChainKey,
    pad.feeSlugs.length ? "DefiLlama revenue 日频图不可用。" : "未配置 fees slug。",
  );

  let volumeNote: string | null = null;
  let volume: WindowMetric;
  if (!pad.volumeSlugs.length) {
    volumeNote = "DefiLlama 暂无该发射台的 DEX volume 适配器，无法从日频图汇总成交量。";
    volume = emptyMetric(volumeNote);
  } else {
    volume = metricFromSlugs(
      pad.volumeSlugs,
      volumeSummaries,
      pad.volumeChainKey,
      "DefiLlama DEX 日频成交量不可用。",
    );
    if (pad.volumeSlugs.length < pad.feeSlugs.length) {
      volumeNote = `成交量仅覆盖 ${pad.volumeSlugs.join(" + ")}，费用覆盖 ${pad.feeSlugs.join(" + ")}。`;
    }
    volumeNote = [volumeNote, `30/60/90 天窗口由 ${CHAIN_LABEL[pad.volumeChainKey]} 日频图加总；不足完整窗口显示 —。`]
      .filter(Boolean)
      .join(" ");
  }

  const creatorShareApprox: WindowMetric = {
    d30:
      grossFees.d30 == null ? null : Math.max(0, grossFees.d30 - (protocolRevenue.d30 ?? 0)),
    d60:
      grossFees.d60 == null ? null : Math.max(0, grossFees.d60 - (protocolRevenue.d60 ?? 0)),
    d90:
      grossFees.d90 == null ? null : Math.max(0, grossFees.d90 - (protocolRevenue.d90 ?? 0)),
    missing: {
      ...(grossFees.missing.d30 ? { d30: grossFees.missing.d30 } : {}),
      ...(grossFees.missing.d60 ? { d60: grossFees.missing.d60 } : {}),
      ...(grossFees.missing.d90 ? { d90: grossFees.missing.d90 } : {}),
    },
    series: residualSeries(grossFees.series, protocolRevenue.series),
  };

  return {
    id: pad.id,
    displayName: pad.displayName,
    chainId: pad.chainId,
    primary: pad.primary,
    color: pad.color,
    url: pad.url,
    defillamaUrl: pad.defillamaUrl,
    noteZh: pad.noteZh,
    volume,
    volumeNoteZh: volumeNote,
    grossFees,
    protocolRevenue,
    creatorShareApprox,
    feeMethodologyZh: methodologies[0] ?? null,
    topTokens: [],
    topTokensNoteZh: pad.geckoDexes.length
      ? "GeckoTerminal 该 DEX 第一页池按 FDV/市值排序的样本，不是全历史市值榜；市值字段常为空时用 FDV。"
      : "无公开、可自动对齐的发射台代币市值榜（GeckoTerminal 无独立 DEX id）。",
    sources: [
      { name: "DefiLlama fees", url: `https://api.llama.fi/summary/fees/${pad.feeSlugs[0]}` },
      { name: "DefiLlama protocol", url: pad.defillamaUrl },
      ...(pad.volumeSlugs.length
        ? [{ name: "DefiLlama DEX volume", url: `https://defillama.com/protocol/${pad.volumeSlugs[0]}` }]
        : []),
    ],
  };
}

export async function getLaunchpadsData(): Promise<LaunchpadsPayload> {
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];
  const duneConfigured = Boolean(process.env.DUNE_API_KEY?.trim());

  const sources = [
    {
      name: "DefiLlama summary/fees/{slug} dailyFees",
      url: "https://api.llama.fi/summary/fees/pons-v2?dataType=dailyFees",
      noteZh: "毛手续费。30/60/90 天由 totalDataChart / chain breakdown 日频加总。",
    },
    {
      name: "DefiLlama summary/fees/{slug} dailyRevenue",
      url: "https://api.llama.fi/summary/fees/pons-v2?dataType=dailyRevenue",
      noteZh: "协议收入，与毛手续费分开。Pons 创作者分成用毛费 − 收入近似。",
    },
    {
      name: "DefiLlama summary/dexs/{slug}",
      url: "https://api.llama.fi/summary/dexs/pump.fun",
      noteZh: "发射台 DEX / 曲线成交量日频图，同样按 30/60/90 天窗口加总。",
    },
    {
      name: "GeckoTerminal dex pools",
      url: "https://api.geckoterminal.com/api/v2/networks/{network}/dexes/{dex}/pools",
      noteZh: "Top5 市值/FDV 样本（第一页池，非全历史榜）。",
    },
  ];

  const emptyChains = () => seed.chains.map((c) => ({ ...c, launchpads: [] }));

  try {
    const feeSlugs = [...new Set(seed.launchpads.flatMap((p) => p.feeSlugs))];
    const volumeSlugs = [...new Set(seed.launchpads.flatMap((p) => p.volumeSlugs))];
    const feeSummaries = new Map<string, LlamaSummary>();
    const revenueSummaries = new Map<string, LlamaSummary>();
    const volumeSummaries = new Map<string, LlamaSummary>();

    await Promise.all([
      ...feeSlugs.map(async (slug) => {
        const fees = await settled(
          `summary/fees/${slug}`,
          llamaJson<LlamaSummary>(
            `https://api.llama.fi/summary/fees/${encodeURIComponent(slug)}?dataType=dailyFees`,
          ),
          warnings,
        );
        const rev = await settled(
          `summary/revenue/${slug}`,
          llamaJson<LlamaSummary>(
            `https://api.llama.fi/summary/fees/${encodeURIComponent(slug)}?dataType=dailyRevenue`,
          ),
          warnings,
        );
        if (fees) feeSummaries.set(slug, fees);
        if (rev) revenueSummaries.set(slug, rev);
      }),
      ...volumeSlugs.map(async (slug) => {
        const vol = await settled(
          `summary/dexs/${slug}`,
          llamaJson<LlamaSummary>(`https://api.llama.fi/summary/dexs/${encodeURIComponent(slug)}`),
          warnings,
        );
        if (vol) volumeSummaries.set(slug, vol);
      }),
    ]);

    const geckoJobs = seed.launchpads.flatMap((pad) =>
      pad.geckoDexes.map((g) => ({ padId: pad.id, ...g })),
    );
    const geckoResults = new Map<
      string,
      { network: string; pools: GeckoPool[]; tokens: Map<string, GeckoToken> }
    >();
    await Promise.all(
      geckoJobs.map(async (job) => {
        const key = `${job.padId}:${job.network}:${job.dex}`;
        const result = await geckoPools(job.network, job.dex, warnings);
        geckoResults.set(key, { network: job.network, ...result });
      }),
    );

    const cards: LaunchpadCard[] = [];
    for (const pad of seed.launchpads) {
      const card = buildCard(pad, feeSummaries, revenueSummaries, volumeSummaries);
      const batches = pad.geckoDexes
        .map((g) => geckoResults.get(`${pad.id}:${g.network}:${g.dex}`))
        .filter((x): x is { network: string; pools: GeckoPool[]; tokens: Map<string, GeckoToken> } => Boolean(x));
      card.topTokens = tokensFromPools(batches);
      if (pad.geckoDexes.length && card.topTokens.length === 0) {
        card.topTokensNoteZh = "GeckoTerminal 该 DEX 池暂无可用 FDV/市值，或接口失败。";
      }
      cards.push(card);
    }

    const chains = seed.chains.map((chain) => ({
      ...chain,
      launchpads: cards.filter((c) => c.chainId === chain.id),
    }));

    if (!duneConfigured) {
      warnings.push("未配置 DUNE_API_KEY：Dune 看板仅作外链对照，实时数来自 DefiLlama / GeckoTerminal。");
    }

    return {
      ok: feeSummaries.size > 0 || volumeSummaries.size > 0,
      error: feeSummaries.size || volumeSummaries.size ? null : "DefiLlama fees/dexs 均不可用。",
      warnings,
      fetchedAt,
      timezone: "Asia/Shanghai",
      duneConfigured,
      duneBoards: seed.duneBoards,
      chains,
      sources,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: message,
      warnings,
      fetchedAt,
      timezone: "Asia/Shanghai",
      duneConfigured,
      duneBoards: seed.duneBoards,
      chains: emptyChains(),
      sources,
    };
  }
}
