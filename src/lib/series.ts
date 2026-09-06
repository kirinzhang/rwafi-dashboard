import type { SeriesPoint } from "./types";

const DAY = 86_400;

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

export function lastDays(series: SeriesPoint[], days: number): SeriesPoint[] {
  if (!series.length) return [];
  const end = series[series.length - 1].date;
  const start = end - days * DAY;
  return series.filter((p) => p.date >= start);
}

export function mergeIssuerSeries(
  seriesList: { slug: string; points: SeriesPoint[] }[],
): SeriesPoint[] {
  const dates = new Set<number>();
  const bySlug = new Map<string, Map<number, number>>();
  for (const item of seriesList) {
    const map = new Map<number, number>();
    for (const point of item.points) {
      const day = Math.floor(point.date / DAY) * DAY;
      dates.add(day);
      map.set(day, point.value);
    }
    bySlug.set(item.slug, map);
  }
  const ordered = [...dates].sort((a, b) => a - b);
  const lastBySlug = new Map<string, number>();
  return ordered.map((date) => {
    let sum = 0;
    for (const [slug, map] of bySlug) {
      const next = map.get(date);
      if (next != null) lastBySlug.set(slug, next);
      sum += lastBySlug.get(slug) ?? 0;
    }
    return { date, value: sum };
  });
}

export function usdFromPegged(
  bag: Record<string, number> | null | undefined,
  key = "peggedUSD",
): number {
  if (!bag) return 0;
  const value = bag[key];
  return Number.isFinite(value) ? value : 0;
}
