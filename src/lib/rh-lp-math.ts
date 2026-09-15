import { INITIAL_LP_USD, INITIAL_QUOTE_USD, INITIAL_STOCK_USD } from "./rh-lp-constants";
import type { RhLpBacktestPoint } from "./rh-lp-types";

export function finite(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function positive(value: unknown): number | null {
  const n = finite(value);
  return n != null && n > 0 ? n : null;
}

export function parseFeeRate(
  poolFeePercentage: string | number | null | undefined,
  name: string | null | undefined,
): { feeTierPct: number | null; feeRate: number | null } {
  const direct = finite(poolFeePercentage);
  if (direct != null && direct > 0) {
    return { feeTierPct: direct, feeRate: direct / 100 };
  }
  const match = (name ?? "").match(/(\d+(?:\.\d+)?)\s*%\s*$/);
  if (match) {
    const pct = Number(match[1]);
    if (Number.isFinite(pct) && pct > 0) return { feeTierPct: pct, feeRate: pct / 100 };
  }
  return { feeTierPct: null, feeRate: null };
}

export function grossFeeAprPct(
  volume24h: number | null,
  feeRate: number | null,
  tvl: number | null,
): number | null {
  if (volume24h == null || feeRate == null || tvl == null) return null;
  if (!(tvl > 0) || !(feeRate > 0) || !(volume24h >= 0)) return null;
  return ((volume24h * feeRate) / tvl) * 365 * 100;
}

export type DailyObs = {
  t: number;
  stockUsd: number;
  quoteUsd: number;
  volumeUsd: number;
};

export function runFullRangeBacktest(
  days: DailyObs[],
  feeRate: number | null,
  tvlUsd: number | null,
): { points: RhLpBacktestPoint[]; shareOfPool: number | null } {
  const shareOfPool = tvlUsd != null && tvlUsd > 0 ? INITIAL_LP_USD / tvlUsd : null;
  const points: RhLpBacktestPoint[] = [];
  if (!days.length) return { points, shareOfPool };

  const p0s = days[0].stockUsd;
  const p0q = days[0].quoteUsd;
  if (!(p0s > 0) || !(p0q > 0)) return { points, shareOfPool };

  let feesCum = 0;
  for (const day of days) {
    const stockRet = day.stockUsd / p0s;
    const quoteRet = day.quoteUsd / p0q;
    const lpNoFeesUsd = INITIAL_LP_USD * Math.sqrt(stockRet * quoteRet);
    const hodlUsd = INITIAL_STOCK_USD * stockRet + INITIAL_QUOTE_USD * quoteRet;
    const cashUsd = INITIAL_LP_USD;
    const canFee = shareOfPool != null && feeRate != null && feeRate > 0 && day.volumeUsd >= 0;
    const feesUsd = canFee ? day.volumeUsd * feeRate * shareOfPool : 0;
    feesCum += feesUsd;
    points.push({
      t: day.t,
      stockUsd: day.stockUsd,
      quoteUsd: day.quoteUsd,
      volumeUsd: day.volumeUsd,
      feesUsd,
      feesCumUsd: feesCum,
      lpNoFeesUsd,
      lpUsd: lpNoFeesUsd + feesCum,
      hodlUsd,
      cashUsd,
    });
  }
  return { points, shareOfPool };
}
