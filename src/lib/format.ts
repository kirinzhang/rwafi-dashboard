const SHANGHAI = "Asia/Shanghai";

export function formatUsd(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const n = abs;
  if (n >= 1e12) return `${sign}$${(n / 1e12).toFixed(digits)}T`;
  if (n >= 1e9) return `${sign}$${(n / 1e9).toFixed(digits)}B`;
  if (n >= 1e6) return `${sign}$${(n / 1e6).toFixed(digits)}M`;
  if (n >= 1e3) return `${sign}$${(n / 1e3).toFixed(digits)}K`;
  return `${sign}$${n.toFixed(n >= 100 ? 0 : digits)}`;
}

export function formatUsdPrecise(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1e6 ? 0 : 2,
  }).format(value);
}

export function formatPct(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatApr(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatRatio(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}×`;
}

export function formatShare(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

/** Trailing PE multiple, e.g. 12.4× */
export function formatMultiple(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k×`;
  if (value >= 100) return `${value.toFixed(0)}×`;
  if (value < 1) return `${value.toFixed(2)}×`;
  return `${value.toFixed(digits)}×`;
}

export function formatShanghai(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatShanghaiDate(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function unixToMs(seconds: number): number {
  return seconds * 1000;
}
