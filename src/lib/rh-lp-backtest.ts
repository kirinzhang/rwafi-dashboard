import { llamaJson, settled } from "./llama";
import {
  addrKey,
  DEXPAPRIKA_NETWORK,
  GECKO_NETWORK,
  INITIAL_LP_USD,
  isQuoteAddress,
  WINDOW_DAYS,
} from "./rh-lp-constants";
import {
  type DailyObs,
  parseFeeRate,
  positive,
  runFullRangeBacktest,
} from "./rh-lp-math";
import type { QuoteLeg, RhLpBacktestPayload, RhLpWindowKey } from "./rh-lp-types";

type GtOhlcv = {
  data?: { attributes?: { ohlcv_list?: [number, number, number, number, number, number][] } };
};

type DexPaprikaCandle = {
  time_open?: string;
  close?: number;
  volume?: number;
};

type GtPoolDetail = {
  data?: {
    attributes?: {
      name?: string;
      pool_fee_percentage?: string | number | null;
      reserve_in_usd?: string | number | null;
    };
    relationships?: {
      base_token?: { data?: { id?: string } };
      quote_token?: { data?: { id?: string } };
    };
  };
  included?: { id?: string; type?: string; attributes?: { address?: string; symbol?: string } }[];
};

type DexPairLite = {
  chainId?: string;
  dexId?: string;
  labels?: string[];
  liquidity?: { usd?: number };
  baseToken?: { address?: string; symbol?: string };
  quoteToken?: { address?: string; symbol?: string };
};

const MIN_POINTS = 2;

function dayKey(ts: number): number {
  return Math.floor(ts / 86_400) * 86_400;
}

function dexLabel(dexId: string | undefined, labels: string[] | undefined): string {
  const id = (dexId ?? "").toLowerCase();
  const version = (labels ?? []).find((l) => /^v\d/i.test(l));
  if (id === "uniswap") return version ? `Uniswap ${version}` : "Uniswap";
  const pretty = (id || "DEX").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return version ? `${pretty} ${version}` : pretty;
}

function parseGtRows(rows: [number, number, number, number, number, number][] | undefined): {
  t: number;
  close: number;
  volume: number;
}[] {
  const byDay = new Map<number, { t: number; close: number; volume: number }>();
  for (const row of rows ?? []) {
    const t = dayKey(Number(row[0]));
    const close = positive(row[4]);
    const volume = Number(row[5]);
    if (!t || close == null) continue;
    byDay.set(t, { t, close, volume: Number.isFinite(volume) && volume > 0 ? volume : 0 });
  }
  return [...byDay.values()].sort((a, b) => a.t - b.t);
}

async function fetchGtOhlcv(
  pairAddress: string,
  token: "base" | "quote",
  warnings: string[],
): Promise<{ t: number; close: number; volume: number }[]> {
  const url =
    `https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK}/pools/${addrKey(pairAddress)}` +
    `/ohlcv/day?aggregate=1&limit=1000&currency=usd&token=${token}`;
  const json = await settled(
    `geckoterminal ohlcv ${token}`,
    llamaJson<GtOhlcv>(url, 25_000),
    warnings,
  );
  return parseGtRows(json?.data?.attributes?.ohlcv_list);
}

async function fetchDexPaprikaOhlcv(
  pairAddress: string,
  warnings: string[],
): Promise<{ t: number; close: number; volume: number }[]> {
  const start = new Date(Date.now() - 100 * 86_400_000).toISOString().slice(0, 10);
  const url =
    `https://api.dexpaprika.com/networks/${DEXPAPRIKA_NETWORK}/pools/${addrKey(pairAddress)}` +
    `/ohlcv?start=${start}&interval=24h&limit=120`;
  const json = await settled(
    "dexpaprika ohlcv",
    llamaJson<DexPaprikaCandle[] | { error?: string }>(url, 25_000),
    warnings,
  );
  if (!Array.isArray(json)) return [];
  const byDay = new Map<number, { t: number; close: number; volume: number }>();
  for (const row of json) {
    const close = positive(row.close);
    const t = row.time_open ? dayKey(Date.parse(row.time_open) / 1000) : null;
    if (close == null || t == null || !Number.isFinite(t)) continue;
    const volume = Number(row.volume);
    byDay.set(t, { t, close, volume: Number.isFinite(volume) && volume > 0 ? volume : 0 });
  }
  return [...byDay.values()].sort((a, b) => a.t - b.t);
}

function gtTokenAddress(
  detail: GtPoolDetail | null,
  side: "base_token" | "quote_token",
): string | null {
  const id = detail?.data?.relationships?.[side]?.data?.id;
  if (id) {
    const inc = detail?.included?.find((row) => row.id === id);
    const addr = inc?.attributes?.address;
    if (addr) return addrKey(addr);
    const tail = id.split("_").pop();
    if (tail && tail.startsWith("0x")) return addrKey(tail);
  }
  return null;
}

function sliceWindow(days: DailyObs[], windowDays: number): DailyObs[] {
  if (!days.length) return [];
  const end = days[days.length - 1].t;
  const start = end - windowDays * 86_400;
  return days.filter((d) => d.t >= start);
}

export async function getRhLpBacktest(
  pairAddress: string,
  windowKey: RhLpWindowKey,
): Promise<RhLpBacktestPayload> {
  const warnings: string[] = [];
  const fetchedAt = new Date().toISOString();
  const requestedDays = WINDOW_DAYS[windowKey];
  const addr = pairAddress.trim();

  const empty = (error: string, extra?: Partial<RhLpBacktestPayload>): RhLpBacktestPayload => ({
    ok: false,
    error,
    warnings,
    fetchedAt,
    timezone: "Asia/Shanghai",
    pairAddress: addr,
    symbol: extra?.symbol ?? "—",
    quote: extra?.quote ?? "USDG",
    dexLabel: extra?.dexLabel ?? "—",
    feeTierPct: extra?.feeTierPct ?? null,
    feeRate: extra?.feeRate ?? null,
    tvlUsd: extra?.tvlUsd ?? null,
    windowKey,
    windowRequestedDays: requestedDays,
    windowActualDays: 0,
    truncated: false,
    insufficientHistory: true,
    historyNoteZh: extra?.historyNoteZh ?? "无法回测。",
    source: extra?.source ?? "",
    sourceUrl: extra?.sourceUrl ?? "",
    assumptionsZh: extra?.assumptionsZh ?? [],
    initialUsd: INITIAL_LP_USD,
    shareOfPool: null,
    summary: null,
    points: [],
  });

  if (!/^0x[0-9a-fA-F]{40,64}$/.test(addr)) {
    return empty("无效的池地址");
  }

  const dsUrl = `https://api.dexscreener.com/latest/dex/pairs/robinhood/${addr}`;
  const ds = await settled(
    "dexscreener pair",
    llamaJson<{ pairs?: DexPairLite[] }>(dsUrl, 20_000),
    warnings,
  );
  const pair = ds?.pairs?.[0];
  const gtUrl = `https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK}/pools/${addrKey(addr)}?include=base_token,quote_token`;
  const gt = await settled("geckoterminal pool", llamaJson<GtPoolDetail>(gtUrl, 20_000), warnings);

  const dsBase = addrKey(pair?.baseToken?.address);
  const dsQuote = addrKey(pair?.quoteToken?.address);
  const gtBaseAddr = gtTokenAddress(gt, "base_token");
  const gtQuoteAddr = gtTokenAddress(gt, "quote_token");
  const quote: QuoteLeg | null =
    isQuoteAddress(dsQuote) ?? isQuoteAddress(dsBase) ?? isQuoteAddress(gtQuoteAddr) ?? isQuoteAddress(gtBaseAddr);
  if (!quote) {
    return empty("该池不是官方 USDG 或 WETH 报价腿，拒绝回测。");
  }

  const dsQuoteIsQuote = isQuoteAddress(dsQuote) != null || isQuoteAddress(gtQuoteAddr) != null;
  const symbol =
    (dsQuoteIsQuote ? pair?.baseToken?.symbol : pair?.quoteToken?.symbol) ??
    gt?.data?.attributes?.name?.split("/")[0]?.trim() ??
    "—";
  const fee = parseFeeRate(gt?.data?.attributes?.pool_fee_percentage, gt?.data?.attributes?.name);
  const tvlUsd = positive(pair?.liquidity?.usd) ?? positive(gt?.data?.attributes?.reserve_in_usd);
  const dex = pair ? dexLabel(pair.dexId, pair.labels) : "Uniswap";

  const gtBaseIsStock = gtBaseAddr ? isQuoteAddress(gtBaseAddr) == null : dsQuoteIsQuote;

  const baseSeries = await fetchGtOhlcv(addr, "base", warnings);
  const quoteSeries = await fetchGtOhlcv(addr, "quote", warnings);
  let source = "GeckoTerminal OHLCV day / currency=usd";
  let sourceUrl =
    `https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK}/pools/${addrKey(addr)}/ohlcv/day`;

  const quoteByDay = new Map(quoteSeries.map((r) => [r.t, r]));
  let merged: DailyObs[] = [];
  let quoteGaps = 0;

  if (baseSeries.length >= MIN_POINTS) {
    for (const row of baseSeries) {
      const q = quoteByDay.get(row.t);
      const otherUsd = q?.close ?? (quote === "USDG" ? 1 : null);
      if (otherUsd == null || !(otherUsd > 0)) {
        quoteGaps += 1;
        continue;
      }
      const stockUsd = gtBaseIsStock ? row.close : otherUsd;
      const quoteUsd = gtBaseIsStock ? otherUsd : row.close;
      merged.push({ t: row.t, stockUsd, quoteUsd, volumeUsd: row.volume });
    }
  }

  if (merged.length < MIN_POINTS) {
    const paprika = await fetchDexPaprikaOhlcv(addr, warnings);
    if (paprika.length >= MIN_POINTS && quote === "USDG") {
      source = "DexPaprika OHLCV 24h（GeckoTerminal 不足时备用）";
      sourceUrl = `https://api.dexpaprika.com/networks/${DEXPAPRIKA_NETWORK}/pools/${addrKey(addr)}/ohlcv`;
      merged = paprika.map((row) => ({
        t: row.t,
        stockUsd: row.close,
        quoteUsd: 1,
        volumeUsd: row.volume,
      }));
    }
  }

  const sliced = sliceWindow(merged, requestedDays);
  const actualSpan =
    sliced.length >= 2 ? Math.round((sliced[sliced.length - 1].t - sliced[0].t) / 86_400) : 0;
  const truncated = sliced.length > 0 && sliced[0].t > sliced[sliced.length - 1].t - (requestedDays - 1) * 86_400;
  const insufficient = sliced.length < MIN_POINTS;

  const assumptionsZh = [
    `满档 Uniswap v2 风格：起始 1 美元股票代币 + 1 美元报价资产（共 $${INITIAL_LP_USD}）。`,
    "无常损失按恒定乘积：LP（未计费）= 2 × √(股票收益 × 报价资产收益)。",
    "HODL 50/50 = 起始各 1 美元按现价重估；Hold USDG = 始终 2 美元现金（假设 USDG≈$1）。",
    tvlUsd != null
      ? `费用份额固定为 $${INITIAL_LP_USD} / 当前 TVL，不随历史 TVL 变化，也不是集中流动性份额。`
      : "缺少 TVL，无法估算费用，只画价格路径上的 IL。",
    fee.feeRate != null
      ? `feeRate 来自 GeckoTerminal 档位；日费 ≈ 当日成交额 × feeRate × 份额。`
      : "未知手续费档位：费用记 0，不编造档位。",
    "费用不复投进池，单独累加到期末 LP 价值。",
    "不是 v3/v4 集中流动性精确回测；真实 LP 收益取决于价格区间与在范围内的时间。",
  ];

  if (insufficient) {
    return {
      ok: true,
      error: null,
      warnings,
      fetchedAt,
      timezone: "Asia/Shanghai",
      pairAddress: addr,
      symbol,
      quote,
      dexLabel: dex,
      feeTierPct: fee.feeTierPct,
      feeRate: fee.feeRate,
      tvlUsd,
      windowKey,
      windowRequestedDays: requestedDays,
      windowActualDays: actualSpan,
      truncated,
      insufficientHistory: true,
      historyNoteZh:
        merged.length === 0
          ? "公开接口没有多日 OHLCV/成交量，只有实时快照。不编造 K 线，无法回测。"
          : `窗口内仅有 ${sliced.length} 根日 K（全历史 ${merged.length}），少于回测所需的 2 个收盘价。`,
      source,
      sourceUrl,
      assumptionsZh,
      initialUsd: INITIAL_LP_USD,
      shareOfPool: tvlUsd != null && tvlUsd > 0 ? INITIAL_LP_USD / tvlUsd : null,
      summary: null,
      points: [],
    };
  }

  const { points, shareOfPool } = runFullRangeBacktest(sliced, fee.feeRate, tvlUsd);
  const last = points[points.length - 1];
  const first = points[0];
  const todayKey = dayKey(Date.now() / 1000);
  const lastPartial = last.t === todayKey;

  return {
    ok: true,
    error: null,
    warnings,
    fetchedAt,
    timezone: "Asia/Shanghai",
    pairAddress: addr,
    symbol,
    quote,
    dexLabel: dex,
    feeTierPct: fee.feeTierPct,
    feeRate: fee.feeRate,
    tvlUsd,
    windowKey,
    windowRequestedDays: requestedDays,
    windowActualDays: actualSpan,
    truncated,
    insufficientHistory: false,
    historyNoteZh:
      [
        truncated
          ? `公开历史只有约 ${actualSpan} 个自然日，少于请求的 ${requestedDays} 日，已用窗口内全部可得序列。`
          : null,
        lastPartial ? "最后一根是当日未完结 K 线（UTC），成交量会偏小。" : null,
        quoteGaps > 0 ? `有 ${quoteGaps} 个交易日缺报价资产美元价，已跳过、不插值。` : null,
      ]
        .filter(Boolean)
        .join(" ") || null,
    source,
    sourceUrl,
    assumptionsZh,
    initialUsd: INITIAL_LP_USD,
    shareOfPool,
    summary: last
      ? {
          lpEndUsd: last.lpUsd,
          lpNoFeesEndUsd: last.lpNoFeesUsd,
          hodlEndUsd: last.hodlUsd,
          cashEndUsd: last.cashUsd,
          feesUsd: last.feesCumUsd,
          ilVsHodlUsd: last.lpNoFeesUsd - last.hodlUsd,
          lpReturnPct: ((last.lpUsd - first.cashUsd) / first.cashUsd) * 100,
          hodlReturnPct: ((last.hodlUsd - first.cashUsd) / first.cashUsd) * 100,
          feeReturnPct: (last.feesCumUsd / first.cashUsd) * 100,
        }
      : null,
    points,
  };
}
