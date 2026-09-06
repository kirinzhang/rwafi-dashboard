export const CACHE_SECONDS = 600;

const DEFAULT_UA = "EquityTokenRadar/1.0 (research dashboard; +https://defillama.com)";

export async function llamaJson<T>(url: string, timeoutMs = 25_000): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: CACHE_SECONDS },
    headers: {
      Accept: "application/json",
      "User-Agent": DEFAULT_UA,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`${url} → HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function settled<T>(
  label: string,
  promise: Promise<T>,
  warnings: string[],
): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`${label}: ${message}`);
    return null;
  }
}

export type ProtocolListItem = {
  name: string;
  slug: string;
  category: string | null;
  tvl: number | null;
  change_1d: number | null;
  change_7d: number | null;
  change_1m: number | null;
  chains: string[] | null;
  url: string | null;
  logo: string | null;
  description: string | null;
};

export type ProtocolDetail = {
  name?: string;
  url?: string;
  logo?: string;
  category?: string;
  chains?: string[];
  tvl?: { date: number; totalLiquidityUSD: number }[];
  currentChainTvls?: Record<string, number>;
};

export type LlamaChain = {
  name: string;
  tvl: number;
  chainId: number | null;
};

export type PeggedAsset = {
  id: string;
  name: string;
  symbol: string;
  pegMechanism?: string;
  circulating?: Record<string, number>;
  circulatingPrevDay?: Record<string, number>;
  circulatingPrevWeek?: Record<string, number>;
  circulatingPrevMonth?: Record<string, number>;
  chains?: string[];
};

export type StablesResponse = {
  peggedAssets: PeggedAsset[];
};

export type StableChainRow = {
  name: string;
  totalCirculatingUSD?: Record<string, number>;
};

export type StableChartPoint = {
  date: string | number;
  totalCirculatingUSD?: Record<string, number>;
  totalCirculating?: Record<string, number>;
};
