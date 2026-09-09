import type { ProtocolDetail } from "./llama";
import { DAY } from "./series";
import type { SeriesPoint } from "./types";

export const UNMAPPED_TICKER_SLUG = "__unmapped";

export const TICKER_Y_AXIS_ZH = "DefiLlama 协议 TVL，按标的股票拆分（USD）";
export const TICKER_Y_AXIS_EN = "Same issuer TVL restacked by underlying ticker (USD)";
export const TICKER_RANKING_RULE_ZH =
  "与按发行方同一批协议、同一日 TVL 合计。Top 10 按最新一日已映射个股市占锁定；现金 / 收益稳定币 / 债券及无法映射的代币计入「其他」。每个 UTC 日只取 tokensInUsd 最后一次观测，不把盘中快照加到日柱上。Ondo 去 ON，xStocks 去 X，BackedFi 去 B。CRCL = NYSE 股票代币（CRCLON/CRCLX），不是 USDC/USYC。";

export const TICKER_NOTES: Record<string, string> = {
  CRCL: "Circle Internet Group（NYSE:CRCL）股票代币，来自 CRCLON / CRCLX，不是 USDC 或 Circle USYC。",
};

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

const CASH_OR_YIELD = new Set([
  "USDT",
  "USDC",
  "DAI",
  "USD",
  "USYC",
  "USDG",
  "USDS",
  "USDE",
  "USDY",
  "USDP",
  "PYUSD",
  "FDUSD",
  "TUSD",
  "GUSD",
  "RLUSD",
  "EURC",
  "OUSG",
  "OUSD",
  "BUIDL",
  "TBILL",
  "USTB",
  "USDON",
  "USDPLUS",
]);

function dayKey(timestamp: number): number {
  return Math.floor(timestamp / DAY) * DAY;
}

function tickerColor(ticker: string): string {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = (hash * 31 + ticker.charCodeAt(i)) >>> 0;
  return TICKER_COLORS[hash % TICKER_COLORS.length];
}

function isCashOrYield(symbol: string): boolean {
  if (CASH_OR_YIELD.has(symbol)) return true;
  if (symbol.startsWith("USD") || symbol.includes("USD")) return true;
  if (symbol.startsWith("OUSG") || symbol.includes("USYC")) return true;
  return false;
}

function looksLikeBondOrNote(symbol: string): boolean {
  return /\d/.test(symbol);
}

/**
 * Map protocol token symbols onto TradFi equity/ETF tickers.
 * Cash, Circle yield (USYC), T-bills, and unknown → null (「其他」).
 * Issuer-scoped suffixes so MUON → MU and CRCLON → CRCL, while USYC never becomes a stock.
 */
export function underlyingTicker(symbol: string, issuerSlug?: string): string | null {
  const s = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s || isCashOrYield(s)) return null;

  let core: string | null = null;
  if (!issuerSlug || issuerSlug === "ondo-global-markets") {
    if (s.endsWith("ON") && s.length >= 4) {
      const stripped = s.slice(0, -2);
      if (/^[A-Z]{1,5}$/.test(stripped)) core = stripped;
    }
  }
  if (!core && (!issuerSlug || issuerSlug === "xstocks")) {
    if (s.endsWith("X") && s.length >= 4 && s.length <= 6) {
      const stripped = s.slice(0, -1);
      if (/^[A-Z]{1,5}$/.test(stripped)) core = stripped;
    }
  }
  if (!core && issuerSlug === "backedfi") {
    if (s.startsWith("B") && s.length >= 5 && s.length <= 7) {
      const stripped = s.slice(1);
      if (/^[A-Z]{2,5}$/.test(stripped)) core = stripped;
    }
  }
  if (!core && issuerSlug && issuerSlug !== "ondo-global-markets" && issuerSlug !== "xstocks" && issuerSlug !== "backedfi") {
    if (/^[A-Z]{1,5}$/.test(s)) core = s;
  }
  if (!core && !issuerSlug && /^[A-Z]{1,5}$/.test(s)) core = s;

  if (!core || isCashOrYield(core) || looksLikeBondOrNote(core)) return null;
  return core;
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

    const tokenByDay = new Map<number, Record<string, number>>();
    for (const row of issuer.detail?.tokensInUsd ?? []) {
      tokenByDay.set(dayKey(row.date), row.tokens ?? {});
    }

    let mappedUsd = 0;
    let otherUsd = 0;

    const days = new Set([...tvlDays.keys(), ...tokenByDay.keys()]);
    for (const day of days) {
      const tokens = tokenByDay.get(day) ?? {};
      let mappedDay = 0;
      for (const [symbol, usd] of Object.entries(tokens)) {
        if (!Number.isFinite(usd) || usd <= 0) continue;
        const ticker = underlyingTicker(symbol, issuer.slug);
        if (!ticker) continue;
        if (!byTicker.has(ticker)) byTicker.set(ticker, new Map());
        const map = byTicker.get(ticker)!;
        map.set(day, (map.get(day) ?? 0) + usd);
        mappedDay += usd;
        mappedUsd += usd;
      }
      const tvl = tvlDays.get(day);
      const budget = tvl != null ? tvl : mappedDay;
      const other = Math.max(0, budget - mappedDay);
      if (other > 0) {
        unmapped.set(day, (unmapped.get(day) ?? 0) + other);
        otherUsd += other;
      }
    }

    if (!tokenByDay.size && tvlDays.size) {
      notesZh.push(`${issuer.displayName}：无 tokensInUsd，协议 TVL 计入「其他」`);
    } else if (mappedUsd === 0 && otherUsd > 0) {
      notesZh.push(
        `${issuer.displayName}：tokensInUsd 无法映射为股票代码（如 USD+ / USDT / USYC），计入「其他」`,
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
      displayName: "其他",
      shortName: "其他",
      color: "#64748b",
      points: [...unmapped.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([date, value]) => ({ date, value })),
    });
  }

  return { series, notesZh, mappedTickerCount: byTicker.size };
}
