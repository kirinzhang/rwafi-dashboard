export type QuoteLeg = "USDG" | "WETH";

export type RhLpWindowKey = "d7" | "d30" | "d90";

export type RhAsset = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  status: string;
  logoUrl: string | null;
  seeded: boolean;
};

export type RhOfficialPrice = {
  symbol: string;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  generatedAt: string | null;
  halted: boolean;
};

export type RhLpPoolRow = {
  id: string;
  symbol: string;
  stockName: string;
  stockAddress: string;
  logoUrl: string | null;
  quote: QuoteLeg;
  quoteAddress: string;
  quoteLabel: string;
  pairLabel: string;
  pairAddress: string;
  dexId: string;
  dexLabel: string;
  feeTierPct: number | null;
  feeRate: number | null;
  tvlUsd: number | null;
  volume24hUsd: number | null;
  volTvl: number | null;
  grossFeeAprPct: number | null;
  priceUsd: number | null;
  priceNative: number | null;
  priceChange24hPct: number | null;
  rhMidUsd: number | null;
  premiumPct: number | null;
  txns24h: number | null;
  pairCreatedAt: string | null;
  dexscreenerUrl: string;
  explorerUrl: string;
  geckoTerminalUrl: string;
  uniswapUrl: string;
  source: string;
};

export type RhLpKpi = {
  key: string;
  labelZh: string;
  labelEn: string;
  valueUsd: number | null;
  valueText: string | null;
  footnoteZh: string;
};

export type RhLpPayload = {
  ok: boolean;
  error: string | null;
  warnings: string[];
  fetchedAt: string;
  timezone: "Asia/Shanghai";
  cacheSeconds: number;
  chainId: 4663;
  missingOfficial: { symbol: string; noteZh: string }[];
  assets: RhAsset[];
  pools: RhLpPoolRow[];
  kpis: {
    poolCount: RhLpKpi;
    tvl: RhLpKpi;
    volume24h: RhLpKpi;
    deepest: RhLpKpi;
  };
  sources: {
    endpoints: { name: string; url: string; noteZh: string }[];
  };
  dataNotesZh: string[];
};

export type RhLpBacktestPoint = {
  t: number;
  stockUsd: number;
  quoteUsd: number;
  volumeUsd: number;
  feesUsd: number;
  feesCumUsd: number;
  lpNoFeesUsd: number;
  lpUsd: number;
  hodlUsd: number;
  cashUsd: number;
};

export type RhLpBacktestPayload = {
  ok: boolean;
  error: string | null;
  warnings: string[];
  fetchedAt: string;
  timezone: "Asia/Shanghai";
  pairAddress: string;
  symbol: string;
  quote: QuoteLeg;
  dexLabel: string;
  feeTierPct: number | null;
  feeRate: number | null;
  tvlUsd: number | null;
  windowKey: RhLpWindowKey;
  windowRequestedDays: number;
  windowActualDays: number;
  truncated: boolean;
  insufficientHistory: boolean;
  historyNoteZh: string | null;
  source: string;
  sourceUrl: string;
  assumptionsZh: string[];
  initialUsd: number;
  shareOfPool: number | null;
  summary: {
    lpEndUsd: number | null;
    lpNoFeesEndUsd: number | null;
    hodlEndUsd: number | null;
    cashEndUsd: number | null;
    feesUsd: number | null;
    ilVsHodlUsd: number | null;
    lpReturnPct: number | null;
    hodlReturnPct: number | null;
    feeReturnPct: number | null;
  } | null;
  points: RhLpBacktestPoint[];
};
