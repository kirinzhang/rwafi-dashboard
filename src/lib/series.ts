import type { SeriesPoint } from "./types";

export const DAY = 86_400;

export function pctChange(current: number | null, past: number | null): number | null {
  if (current == null || past == null) return null;
  if (!Number.isFinite(current) || !Number.isFinite(past) || past === 0) return null;
  return ((current - past) / past) * 100;
}

export function valueNear(
  series: SeriesPoint[],
  daysAgo: number,
  maxDriftDays = 2,
): number | null {
  if (!series.length) return null;
  const latest = series[series.length - 1];
  const target = latest.date - daysAgo * DAY;
  let best = series[0];
  let bestDiff = Math.abs(best.date - target);
  for (const point of series) {
    const diff = Math.abs(point.date - target);
    if (diff < bestDiff) {
      best = point;
      bestDiff = diff;
    }
  }
  if (bestDiff > maxDriftDays * DAY) return null;
  return best.value;
}

export function changeFromSeries(series: SeriesPoint[]): {
  d1: number | null;
  d7: number | null;
  d30: number | null;
} {
  if (!series.length) return { d1: null, d7: null, d30: null };
  const current = series[series.length - 1].value;
  return {
    d1: pctChange(current, valueNear(series, 1, 1.5)),
    d7: pctChange(current, valueNear(series, 7, 2)),
    d30: pctChange(current, valueNear(series, 30, 3)),
  };
}

export function downsample(series: SeriesPoint[], maxPoints: number): SeriesPoint[] {
  if (series.length <= maxPoints) return series;
  const step = Math.ceil(series.length / maxPoints);
  const out: SeriesPoint[] = [];
  for (let i = 0; i < series.length; i += step) {
    out.push(series[i]);
  }
  const last = series[series.length - 1];
  if (out[out.length - 1]?.date !== last.date) out.push(last);
  return out;
}

export function lastDays<T extends { date: number }>(series: T[], days: number): T[] {
  if (!series.length) return [];
  const end = series[series.length - 1].date;
  const start = end - days * DAY;
  return series.filter((p) => p.date >= start);
}

export const OTHER_STACK_KEY = "other";
export const OTHER_STACK_COLOR = "#64748b";

export function mergeIssuerSeries(
  seriesList: { slug: string; points: SeriesPoint[] }[],
): SeriesPoint[] {
  return alignPlatformSeries(seriesList).map((row) => ({ date: row.date, value: row.total }));
}

type NamedSeries = {
  slug: string;
  displayName: string;
  shortName: string;
  color: string;
  points: SeriesPoint[];
};

export function alignPlatformSeries(
  seriesList: { slug: string; points: SeriesPoint[] }[],
  mode: "forward" | "zero" = "forward",
): { date: number; total: number; values: Record<string, number> }[] {
  const dates = new Set<number>();
  const bySlug = new Map<string, Map<number, number>>();
  for (const item of seriesList) {
    if (!item.points.length) continue;
    const map = new Map<number, number>();
    for (const point of item.points) {
      if (!Number.isFinite(point.value)) continue;
      const day = Math.floor(point.date / DAY) * DAY;
      dates.add(day);
      map.set(day, point.value);
    }
    if (map.size) bySlug.set(item.slug, map);
  }
  const ordered = [...dates].sort((a, b) => a - b);
  const lastBySlug = new Map<string, number>();
  const seen = new Set<string>();
  return ordered.map((date) => {
    const values: Record<string, number> = {};
    let total = 0;
    for (const [slug, map] of bySlug) {
      const next = map.get(date);
      if (mode === "zero") {
        const value = next ?? 0;
        values[slug] = value;
        total += value;
        continue;
      }
      if (next != null) {
        lastBySlug.set(slug, next);
        seen.add(slug);
      }
      const value = seen.has(slug) ? (lastBySlug.get(slug) ?? 0) : 0;
      values[slug] = value;
      total += value;
    }
    return { date, total, values };
  });
}

export function buildStackedIssuance(
  seriesList: NamedSeries[],
  topN = 10,
  options?: { alwaysOther?: string[] },
): {
  series: {
    key: string;
    displayName: string;
    shortName: string;
    color: string;
    latestUsd: number;
  }[];
  points: { date: number; total: number; values: Record<string, number> }[];
} {
  const alwaysOther = new Set(options?.alwaysOther ?? []);
  const withHistory = seriesList.filter((item) => item.points.some((p) => p.value > 0));
  const aligned = alignPlatformSeries(withHistory, "zero");
  if (!aligned.length) return { series: [], points: [] };
  const last = aligned[aligned.length - 1];
  const forced = withHistory.filter((item) => alwaysOther.has(item.slug));
  const rankable = withHistory.filter((item) => !alwaysOther.has(item.slug));
  const ranked = [...rankable]
    .map((item) => ({ ...item, latest: last.values[item.slug] ?? 0 }))
    .sort((a, b) => b.latest - a.latest);
  const top = ranked.slice(0, topN);
  const rest = [...ranked.slice(topN), ...forced];
  const includeOther = rest.length > 0;
  const series = [
    ...top.map((item) => ({
      key: item.slug,
      displayName: item.displayName,
      shortName: item.shortName,
      color: item.color,
      latestUsd: item.latest,
    })),
    ...(includeOther
      ? [
          {
            key: OTHER_STACK_KEY,
            displayName: "其他",
            shortName: "其他",
            color: OTHER_STACK_COLOR,
            latestUsd: rest.reduce((sum, item) => sum + (last.values[item.slug] ?? 0), 0),
          },
        ]
      : []),
  ];
  const points = aligned.map((row) => {
    const values: Record<string, number> = {};
    let total = 0;
    for (const item of top) {
      const value = row.values[item.slug] ?? 0;
      values[item.slug] = value;
      total += value;
    }
    if (includeOther) {
      const other = rest.reduce((sum, item) => sum + (row.values[item.slug] ?? 0), 0);
      values[OTHER_STACK_KEY] = other;
      total += other;
    }
    return { date: row.date, total, values };
  });
  return { series, points };
}

export function weeklyLastSnapshot<T extends { date: number }>(points: T[]): T[] {
  const WEEK = 7 * DAY;
  const buckets = new Map<number, T>();
  for (const point of points) {
    const week = Math.floor(point.date / WEEK) * WEEK;
    const prev = buckets.get(week);
    if (!prev || point.date >= prev.date) buckets.set(week, point);
  }
  return [...buckets.values()].sort((a, b) => a.date - b.date);
}

export function usdFromPegged(
  bag: Record<string, number> | null | undefined,
  key = "peggedUSD",
): number {
  if (!bag) return 0;
  const value = bag[key];
  return Number.isFinite(value) ? value : 0;
}
