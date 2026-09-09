import type { ProtocolDetail } from "./llama";
import { DAY } from "./series";
import type { SeriesPoint } from "./types";

export const UNMAPPED_TICKER_SLUG = "__unmapped";

export const TICKER_Y_AXIS_ZH = "DefiLlama tokensInUsd 按标的股票合计（USD）";
export const TICKER_Y_AXIS_EN = "DefiLlama tokensInUsd by underlying ticker (USD)";
export const TICKER_RANKING_RULE_ZH =
  "Top 10 标的按最新一日已映射 tokensInUsd 市占一次性固定；现金（USD / USDT / USDC / USD+ 等）与无法映射的代币、以及仅有协议 TVL、没有 tokensInUsd 的发行方/日期，一律计入「其他」。Ondo 去掉 ON 后缀，xStocks 去掉 X 后缀，BackedFi 去掉 b 前缀。不用发行方合计编造个股序列。";

const TICKER_COLORS = [
  "#fb7185",
  "#34d399",
  "#60a5fa",
  "#fbbf24",
  "#c084fc",
  "#22d3ee",
  "#f97316",
  "#a3e635",
  "#e879f9",
  "#818cf8",
];

function dayKey(timestamp: number): number {
  return Math.floor(timestamp / DAY) * DAY;
}

function tickerColor(ticker: string): string {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = (hash * 31 + ticker.charCodeAt(i)) >>> 0;
  return TICKER_COLORS[hash % TICKER_COLORS.length];
}

/**
 * Map protocol token symbols onto TradFi tickers.
 * Cash / unknown → null (folded into 「其他」, never invented from issuer TVL).
 */
export function underlyingTicker(symbol: string): string | null {
  const s = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return null;
  if (s === "USDT" || s === "USDC" || s === "DAI" || s === "USD" || s.startsWith("USD")) return null;
  if (s.endsWith("ON") && s.length >= 5) {
    const core = s.slice(0, -2);
    if (/^[A-Z]{1,5}$/.test(core)) return core;
  }
  if (s.endsWith("X") && s.length >= 4 && s.length <= 6) {
    const core = s.slice(0, -1);
    if (/^[A-Z]{1,5}$/.test(core)) return core;
  }
  if (s.startsWith("B") && s.length >= 5 && s.length <= 7) {
    const core = s.slice(1);
    if (/^[A-Z]{2,5}$/.test(core)) return core;
  }
  if (/^[A-Z]{1,5}$/.test(s)) return s;
  return null;
}

export type TickerNamedSeries = {
  slug: string;
  displayName: string;
  shortName: string;
  color: string;
  points: SeriesPoint[];
};

export function collectTickerSeries(
  issuers: { slug: string; displayName: string; detail: ProtocolDetail | null }[],
): { series: TickerNamedSeries[]; notesZh: string[]; mappedTickerCount: number } {
  const byTicker = new Map<string, Map<number, number>>();
  const unmapped = new Map<number, number>();
  const notesZh: string[] = [];

  for (const issuer of issuers) {
    const tvlDays = new Map<number, number>();
    for (const point of issuer.detail?.tvl ?? []) {
      if (!Number.isFinite(point.totalLiquidityUSD)) continue;
      tvlDays.set(dayKey(point.date), point.totalLiquidityUSD);
    }
    const tokenDays = issuer.detail?.tokensInUsd ?? [];
    const covered = new Set<number>();
    let mappedUsd = 0;
    let unmappedUsd = 0;

    for (const row of tokenDays) {
      const day = dayKey(row.date);
      covered.add(day);
      const tokens = row.tokens ?? {};
      let daySum = 0;
      for (const [symbol, usd] of Object.entries(tokens)) {
        if (!Number.isFinite(usd) || usd <= 0) continue;
        daySum += usd;
        const ticker = underlyingTicker(symbol);
        if (!ticker) {
          unmapped.set(day, (unmapped.get(day) ?? 0) + usd);
          unmappedUsd += usd;
          continue;
        }
        if (!byTicker.has(ticker)) byTicker.set(ticker, new Map());
        const map = byTicker.get(ticker)!;
        map.set(day, (map.get(day) ?? 0) + usd);
        mappedUsd += usd;
      }
      const tvl = tvlDays.get(day);
      if (tvl != null && tvl > daySum + 1) {
        const gap = tvl - daySum;
        unmapped.set(day, (unmapped.get(day) ?? 0) + gap);
        unmappedUsd += gap;
      }
    }

    for (const [day, tvl] of tvlDays) {
      if (!covered.has(day)) {
        unmapped.set(day, (unmapped.get(day) ?? 0) + tvl);
        unmappedUsd += tvl;
      }
    }

    if (!tokenDays.length && tvlDays.size) {
      notesZh.push(`${issuer.displayName}：无 tokensInUsd，协议 TVL 计入「其他」`);
    } else if (mappedUsd === 0 && unmappedUsd > 0) {
      notesZh.push(
        `${issuer.displayName}：tokensInUsd 无法映射为股票代码（如 USD+ / USDT），计入「其他」`,
      );
    }
  }

  const series: TickerNamedSeries[] = [...byTicker.entries()].map(([ticker, map]) => ({
    slug: ticker,
    displayName: ticker,
    shortName: ticker,
    color: tickerColor(ticker),
    points: [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([date, value]) => ({ date, value })),
  }));

  if (unmapped.size) {
    series.push({
      slug: UNMAPPED_TICKER_SLUG,
      displayName: "未映射",
      shortName: "未映射",
      color: "#64748b",
      points: [...unmapped.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([date, value]) => ({ date, value })),
    });
  }

  return { series, notesZh, mappedTickerCount: byTicker.size };
}
