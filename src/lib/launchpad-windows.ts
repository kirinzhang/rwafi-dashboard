import type { DailyPoint, RangeKey, WindowMetric } from "./launchpad-types";

export const DAY = 86_400;

export function mergeDaily(seriesList: DailyPoint[][]): DailyPoint[] {
  const map = new Map<number, number>();
  for (const series of seriesList) {
    for (const point of series) {
      map.set(point.t, (map.get(point.t) ?? 0) + point.v);
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, v]) => ({ t, v }));
}

export function lastDays(series: DailyPoint[], days: number): DailyPoint[] {
  if (!series.length) return [];
  const end = series[series.length - 1].t;
  const start = end - days * DAY;
  return series.filter((p) => p.t >= start);
}

export function sliceWindow(series: DailyPoint[], days: number): DailyPoint[] {
  if (!series.length) return [];
  const end = series[series.length - 1].t;
  const start = end - days * DAY;
  return series.filter((p) => p.t > start && p.t <= end);
}

export function windowTotal(
  series: DailyPoint[],
  days: number,
): { value: number | null; reason: string | null } {
  if (!series.length) {
    return { value: null, reason: "无 DefiLlama 日频序列" };
  }
  const sorted = [...series].sort((a, b) => a.t - b.t);
  const end = sorted[sorted.length - 1].t;
  const windowStart = end - days * DAY;
  const historyStart = sorted[0].t;
  if (historyStart > windowStart + 2 * DAY) {
    const have = Math.max(1, Math.round((end - historyStart) / DAY) + 1);
    return {
      value: null,
      reason: `日频序列仅约 ${have} 天，不足完整 ${days} 天窗口`,
    };
  }
  const points = sorted.filter((p) => p.t > windowStart && p.t <= end);
  if (!points.length) {
    return { value: null, reason: "该窗口内无数据点" };
  }
  return { value: points.reduce((sum, p) => sum + p.v, 0), reason: null };
}

export function residualSeries(fees: DailyPoint[], revenue: DailyPoint[]): DailyPoint[] {
  const revenueByT = new Map(revenue.map((p) => [p.t, p.v]));
  return fees.map((p) => ({
    t: p.t,
    v: Math.max(0, p.v - (revenueByT.get(p.t) ?? 0)),
  }));
}

export function emptyMetric(reason: string): WindowMetric {
  return {
    d30: null,
    d60: null,
    d90: null,
    all: null,
    missing: { d30: reason, d60: reason, d90: reason, all: reason },
    series: [],
  };
}

export function buildWindowMetric(full: DailyPoint[], native30: number | null): WindowMetric {
  const d30 = windowTotal(full, 30);
  const d60 = windowTotal(full, 60);
  const d90 = windowTotal(full, 90);
  let value30 = d30.value;
  let reason30 = d30.reason;
  if (value30 == null && native30 != null) {
    value30 = native30;
    reason30 = null;
  }
  const allValue = full.length ? full.reduce((sum, p) => sum + p.v, 0) : null;
  const missing: WindowMetric["missing"] = {};
  if (value30 == null && reason30) missing.d30 = reason30;
  if (d60.value == null && d60.reason) missing.d60 = d60.reason;
  if (d90.value == null && d90.reason) missing.d90 = d90.reason;
  if (allValue == null) missing.all = "无 DefiLlama 日频序列";
  return {
    d30: value30,
    d60: d60.value,
    d90: d90.value,
    all: allValue,
    missing,
    series: full,
  };
}

/** Full history bars. Daily if short; weekly sums if the calendar span is too wide. */
export function barsForFullSeries(
  series: DailyPoint[],
  maxBars = 160,
): { points: DailyPoint[]; note: string | null } {
  if (!series.length) return { points: [], note: null };
  const sorted = [...series].sort((a, b) => a.t - b.t);
  const start = sorted[0].t;
  const end = sorted[sorted.length - 1].t;
  const byT = new Map(sorted.map((p) => [p.t, p.v]));
  const nDays = Math.max(1, Math.round((end - start) / DAY) + 1);
  if (nDays <= maxBars) {
    const out: DailyPoint[] = [];
    for (let t = start; t <= end; t += DAY) {
      out.push({ t, v: byT.get(t) ?? 0 });
    }
    return { points: out, note: null };
  }
  const WEEK = 7 * DAY;
  const buckets = new Map<number, number>();
  for (let t = start; t <= end; t += DAY) {
    const week = Math.floor(t / WEEK) * WEEK;
    buckets.set(week, (buckets.get(week) ?? 0) + (byT.get(t) ?? 0));
  }
  return {
    points: [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, v]) => ({ t, v })),
    note: `全部跨度约 ${nDays} 个日历日，柱为每周加总（不是抽样漏天）。`,
  };
}

export function pickRange(metric: WindowMetric, range: RangeKey): number | null {
  return metric[range];
}

export function pickMissing(metric: WindowMetric, range: RangeKey): string | undefined {
  return metric.missing[range];
}

/** Daily bars for a trailing window. Missing days are 0 (not interpolated). */
export function barsForWindow(series: DailyPoint[], days: number, endT?: number): DailyPoint[] {
  if (!series.length && endT == null) return [];
  const sorted = [...series].sort((a, b) => a.t - b.t);
  const end = endT ?? sorted[sorted.length - 1]?.t;
  if (end == null) return [];
  const byT = new Map(sorted.map((p) => [p.t, p.v]));
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = end - i * DAY;
    out.push({ t, v: byT.get(t) ?? 0 });
  }
  return out;
}
