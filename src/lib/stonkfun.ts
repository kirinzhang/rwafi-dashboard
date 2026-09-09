import { llamaJson, settled } from "./llama";
import type { DailyPoint, LaunchpadToken } from "./launchpad-types";
import { windowTotal } from "./launchpad-windows";

export const STONKFUN_API = "https://www.stonkfun.xyz/api/public/v1";
export const STONKFUN_DOCS = "https://www.stonkfun.xyz/developers";
export const STONK_MINT = "6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx";

type Meta = { generatedAt?: string };

type StatsPayload = {
  data?: {
    tokens?: {
      total?: number | null;
      graduated?: number | null;
      aboutToGraduate?: number | null;
      rewardLaunches?: number | null;
      totalMarketCapUsd?: number | null;
      totalVolume24hUsd?: number | null;
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
  meta?: Meta;
};

type RevenuePayload = {
  data?: {
    revenue?: {
      totalRevenueUsd?: number | null;
      totalBuybackUsd?: number | null;
      boughtBackTokens?: number | null;
      buybackCount?: number | null;
      lastBuybackAt?: string | null;
    };
    burns?: {
      totalValueUsdAtBurn?: number | null;
      burnCount?: number | null;
    };
  };
  meta?: Meta;
};

type HistoryPayload = {
  data?: {
    start?: string;
    coverage?: { revenueRowsUnpriced?: number; buybackRowsUnpriced?: number };
    days?: {
      date: string;
      dailyRevenue: number;
      dailyHoldersRevenue: number;
      dailyProtocolRevenue: number;
    }[];
  };
  meta?: Meta;
};

type TokenRow = {
  mint?: string;
  pool?: string;
  name?: string;
  symbol?: string;
  market?: {
    marketCapUsd?: number | null;
    fdvUsd?: number | null;
    volume24hUsd?: number | null;
  };
};

type TokensPayload = {
  data?: {
    tokens?: TokenRow[];
    pagination?: { page?: number; pageSize?: number; total?: number; totalPages?: number };
  };
  meta?: Meta;
};

type TokenDetailPayload = {
  data?: { token?: TokenRow };
  meta?: Meta;
};

type BurnsPayload = {
  data?: {
    totals?: {
      amountTokens?: number | null;
      valueUsdAtBurn?: number | null;
      burnCount?: number | null;
      lastBurnAt?: string | null;
    };
  };
  meta?: Meta;
};

type LaunchesPayload = {
  data?: { pagination?: { total?: number | null } };
  meta?: Meta;
};

type PairsPayload = {
  data?: { pairs?: unknown[] };
  meta?: Meta;
};

export type StonkFunSnapshot = {
  generatedAt: string | null;
  volume24hUsd: number | null;
  platformMcapUsd: number | null;
  tokenCount: number | null;
  graduated: number | null;
  aboutToGraduate: number | null;
  rewardLaunches: number | null;
  launchCount: number | null;
  launchablePairs: number | null;
  stonkMcapUsd: number | null;
  stonkFdvUsd: number | null;
  totalBuybackUsd: number | null;
  totalBurnValueUsd: number | null;
  totalRevenueUsd: number | null;
  lastBuybackAt: string | null;
  stonkBurnValueUsd: number | null;
  stonkBurnCount: number | null;
  lastBurnAt: string | null;
  holdersHistory: DailyPoint[];
  protocolHistory: DailyPoint[];
  revenueHistory: DailyPoint[];
  rev7d: number | null;
  rev30d: number | null;
  historyStart: string | null;
  historyNoteZh: string | null;
  volumeHistoryNoteZh: string;
  topTokens: LaunchpadToken[];
  topTokensNoteZh: string;
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

function latestGeneratedAt(...metas: Array<Meta | undefined>): string | null {
  const times = metas
    .map((m) => m?.generatedAt)
    .filter((v): v is string => Boolean(v))
    .map((v) => Date.parse(v))
    .filter((n) => Number.isFinite(n));
  if (!times.length) return null;
  return new Date(Math.max(...times)).toISOString();
}

/**
 * First-party public API, no key. Read endpoints audited against
 * https://www.stonkfun.xyz/developers (base /api/public/v1).
 *
 * Volume: only tokens.totalVolume24hUsd on /stats. /tokens paginates
 * (~26k rows, pageSize 1–100) with market.volume24hUsd only — no per-token
 * history. Summing pages would reconstruct the same 24h snapshot /stats
 * already publishes; we do not paginate the catalog or mix snapshots.
 */
export async function fetchStonkFun(warnings: string[]): Promise<StonkFunSnapshot | null> {
  const [stats, revenue, history, tokens, stonk, burns, launches, pairs] = await Promise.all([
    settled("stonkfun GET /stats", llamaJson<StatsPayload>(`${STONKFUN_API}/stats`), warnings),
    settled("stonkfun GET /revenue", llamaJson<RevenuePayload>(`${STONKFUN_API}/revenue?limit=1`), warnings),
    settled(
      "stonkfun GET /revenue/history",
      llamaJson<HistoryPayload>(`${STONKFUN_API}/revenue/history`),
      warnings,
    ),
    settled(
      "stonkfun GET /tokens?sort=marketCap",
      llamaJson<TokensPayload>(`${STONKFUN_API}/tokens?sort=marketCap&page=1&pageSize=5`),
      warnings,
    ),
    settled(
      "stonkfun GET /tokens/{STONK}",
      llamaJson<TokenDetailPayload>(`${STONKFUN_API}/tokens/${STONK_MINT}`),
      warnings,
    ),
    settled(
      "stonkfun GET /tokens/{STONK}/burns",
      llamaJson<BurnsPayload>(`${STONKFUN_API}/tokens/${STONK_MINT}/burns?limit=1`),
      warnings,
    ),
    settled(
      "stonkfun GET /launches",
      llamaJson<LaunchesPayload>(`${STONKFUN_API}/launches?page=1&pageSize=1`),
      warnings,
    ),
    settled(
      "stonkfun GET /pairs?launchable=true",
      llamaJson<PairsPayload>(`${STONKFUN_API}/pairs?launchable=true`),
      warnings,
    ),
  ]);

  if (!stats && !revenue && !history && !tokens) return null;

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

  const rev7 = windowTotal(revenueHistory, 7);
  const rev30 = windowTotal(revenueHistory, 30);

  const coverage = history?.data?.coverage;
  const unpriced = (coverage?.revenueRowsUnpriced ?? 0) + (coverage?.buybackRowsUnpriced ?? 0);
  const historyNoteZh = [
    `官方 GET /revenue/history 自 ${history?.data?.start ?? "?"} 起，UTC 日。`,
    "dailyRevenue = 领入国库的报价手续费（PE 分母）；dailyHoldersRevenue = 买回销毁支出；dailyProtocolRevenue = 剩余。",
    "创作者与奖励持有人从 Raydium 直接领取的费用不含在该序列。",
    unpriced ? `${unpriced} 条无报价行计为 0。` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const topTokens: LaunchpadToken[] = (tokens?.data?.tokens ?? []).slice(0, 5).map((row) => ({
    name: row.name || "Unknown",
    symbol: row.symbol || row.name || "?",
    mcapUsd: finite(row.market?.marketCapUsd),
    fdvUsd: finite(row.market?.fdvUsd),
    volume24h: finite(row.market?.volume24hUsd),
    network: "solana",
    poolAddress: row.pool || row.mint || "",
    url: row.mint ? `https://www.stonkfun.xyz/token/${row.mint}` : "https://www.stonkfun.xyz/",
  }));

  const pages = tokens?.data?.pagination?.totalPages;
  const catalog = tokens?.data?.pagination?.total;
  const topTokensNoteZh =
    `StonkFun GET /tokens?sort=marketCap&page=1&pageSize=5。官方分页共 ${catalog ?? "?"} 个代币 / ${pages ?? "?"} 页；本表只取市值第一页 Top 5，不是全目录加总。` +
    " 每个代币只有 market.volume24hUsd，没有日频成交量字段。不把单页 24h 量加总当平台量（平台 24h 以 /stats 为准）。";

  return {
    generatedAt: latestGeneratedAt(
      stats?.meta,
      revenue?.meta,
      history?.meta,
      tokens?.meta,
      stonk?.meta,
      burns?.meta,
      launches?.meta,
      pairs?.meta,
    ),
    volume24hUsd: finite(stats?.data?.tokens?.totalVolume24hUsd),
    platformMcapUsd: finite(stats?.data?.tokens?.totalMarketCapUsd),
    tokenCount: finite(stats?.data?.tokens?.total),
    graduated: finite(stats?.data?.tokens?.graduated),
    aboutToGraduate: finite(stats?.data?.tokens?.aboutToGraduate),
    rewardLaunches: finite(stats?.data?.tokens?.rewardLaunches),
    launchCount: finite(launches?.data?.pagination?.total),
    launchablePairs: pairs?.data?.pairs ? pairs.data.pairs.length : null,
    stonkMcapUsd: finite(stonk?.data?.token?.market?.marketCapUsd),
    stonkFdvUsd: finite(stonk?.data?.token?.market?.fdvUsd),
    totalBuybackUsd:
      finite(revenue?.data?.revenue?.totalBuybackUsd) ?? finite(stats?.data?.revenue?.totalBuybackUsd),
    totalBurnValueUsd:
      finite(revenue?.data?.burns?.totalValueUsdAtBurn) ?? finite(stats?.data?.burns?.totalValueUsdAtBurn),
    totalRevenueUsd:
      finite(revenue?.data?.revenue?.totalRevenueUsd) ?? finite(stats?.data?.revenue?.totalRevenueUsd),
    lastBuybackAt: revenue?.data?.revenue?.lastBuybackAt ?? null,
    stonkBurnValueUsd: finite(burns?.data?.totals?.valueUsdAtBurn),
    stonkBurnCount: finite(burns?.data?.totals?.burnCount),
    lastBurnAt: burns?.data?.totals?.lastBurnAt ?? null,
    holdersHistory,
    protocolHistory,
    revenueHistory,
    rev7d: rev7.value,
    rev30d: rev30.value,
    historyStart: history?.data?.start ?? null,
    historyNoteZh,
    volumeHistoryNoteZh:
      "30/60/90/全部成交量为 —：已审计官方文档全部读接口。GET /stats 只有 tokens.totalVolume24hUsd（平台 24h）。GET /tokens 分页（page/pageSize，约 2.6 万条）仅有 market.volume24hUsd，无日频/历史量。加总各页只会重造同一 24h 快照，且不能把不同时刻的分页拼成日柱。GET /revenue/history 是手续费与买回，不是成交量。GET /total-assets 只有身份没有行情。",
    topTokens,
    topTokensNoteZh,
  };
}
