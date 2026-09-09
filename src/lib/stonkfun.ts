import { llamaJson, settled } from "./llama";
import type { DailyPoint } from "./launchpad-types";

export const STONKFUN_API = "https://www.stonkfun.xyz/api/public/v1";
export const STONKFUN_DOCS = "https://www.stonkfun.xyz/developers";

type StatsPayload = {
  data?: {
    tokens?: {
      totalVolume24hUsd?: number | null;
      totalMarketCapUsd?: number | null;
      total?: number | null;
    };
    revenue?: {
      totalRevenueUsd?: number | null;
      totalBuybackUsd?: number | null;
    };
    burns?: {
      totalValueUsdAtBurn?: number | null;
      burnCount?: number | null;
    };
  };
};

type RevenuePayload = {
  data?: {
    revenue?: {
      totalRevenueUsd?: number | null;
      totalBuybackUsd?: number | null;
      boughtBackTokens?: number | null;
      buybackCount?: number | null;
    };
    burns?: {
      totalValueUsdAtBurn?: number | null;
      burnCount?: number | null;
      bySource?: Record<string, { valueUsd?: number | null; count?: number | null }>;
    };
    config?: { buybacksEnabled?: boolean; buybackBurnEnabled?: boolean };
  };
};

type HistoryPayload = {
  data?: {
    unit?: string;
    start?: string;
    source?: string;
    coverage?: { revenueRowsUnpriced?: number; buybackRowsUnpriced?: number };
    days?: {
      date: string;
      dailyRevenue: number;
      dailyHoldersRevenue: number;
      dailyProtocolRevenue: number;
    }[];
  };
};

export type StonkFunSnapshot = {
  volume24hUsd: number | null;
  totalBuybackUsd: number | null;
  totalBurnValueUsd: number | null;
  totalRevenueUsd: number | null;
  holdersHistory: DailyPoint[];
  protocolHistory: DailyPoint[];
  revenueHistory: DailyPoint[];
  historyStart: string | null;
  historyNoteZh: string | null;
};

function utcDayToUnix(date: string): number | null {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

function finite(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * First-party public API, no key. Bitquery is not used: their StonkFun
 * examples are per-pool DEXTradeByTokens and need an OAuth token outside the IDE.
 */
export async function fetchStonkFun(warnings: string[]): Promise<StonkFunSnapshot | null> {
  const [stats, revenue, history] = await Promise.all([
    settled("stonkfun GET /stats", llamaJson<StatsPayload>(`${STONKFUN_API}/stats`), warnings),
    settled("stonkfun GET /revenue", llamaJson<RevenuePayload>(`${STONKFUN_API}/revenue?limit=1`), warnings),
    settled(
      "stonkfun GET /revenue/history",
      llamaJson<HistoryPayload>(`${STONKFUN_API}/revenue/history`),
      warnings,
    ),
  ]);

  if (!stats && !revenue && !history) return null;

  const holdersHistory: DailyPoint[] = [];
  const protocolHistory: DailyPoint[] = [];
  const revenueHistory: DailyPoint[] = [];
  for (const day of history?.data?.days ?? []) {
    const t = utcDayToUnix(day.date);
    if (t == null) continue;
    holdersHistory.push({ t, v: finite(day.dailyHoldersRevenue) ?? 0 });
    protocolHistory.push({ t, v: finite(day.dailyProtocolRevenue) ?? 0 });
    revenueHistory.push({ t, v: finite(day.dailyRevenue) ?? 0 });
  }

  const coverage = history?.data?.coverage;
  const unpriced = (coverage?.revenueRowsUnpriced ?? 0) + (coverage?.buybackRowsUnpriced ?? 0);
  const historyNoteZh = unpriced
    ? `官方 /revenue/history 自 ${history?.data?.start ?? "?"} 起，按 UTC 日；${unpriced} 条无报价行计为 0。dailyHoldersRevenue = 买回并销毁平台币的支出，不是成交量。`
    : `官方 /revenue/history 自 ${history?.data?.start ?? "?"} 起，按 UTC 日。dailyHoldersRevenue = 买回并销毁平台币的支出，不是成交量。`;

  return {
    volume24hUsd: finite(stats?.data?.tokens?.totalVolume24hUsd),
    totalBuybackUsd:
      finite(revenue?.data?.revenue?.totalBuybackUsd) ?? finite(stats?.data?.revenue?.totalBuybackUsd),
    totalBurnValueUsd:
      finite(revenue?.data?.burns?.totalValueUsdAtBurn) ?? finite(stats?.data?.burns?.totalValueUsdAtBurn),
    totalRevenueUsd:
      finite(revenue?.data?.revenue?.totalRevenueUsd) ?? finite(stats?.data?.revenue?.totalRevenueUsd),
    holdersHistory,
    protocolHistory,
    revenueHistory,
    historyStart: history?.data?.start ?? null,
    historyNoteZh,
  };
}
