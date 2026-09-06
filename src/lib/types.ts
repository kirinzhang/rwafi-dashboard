export type ChangeSet = {
  d1: number | null;
  d7: number | null;
  d30: number | null;
};

export type SeriesPoint = {
  date: number;
  value: number;
};

export type IssuerRow = {
  slug: string;
  displayName: string;
  shortName: string;
  color: string;
  featured: boolean;
  noteZh: string | null;
  tvlUsd: number | null;
  sharePct: number | null;
  chains: string[];
  change: ChangeSet;
  projectUrl: string | null;
  defillamaUrl: string;
  logoUrl: string;
  lastUpdated: string | null;
  sourceLabel: string;
  discovered: boolean;
};

export type TweetSnapshotRow = {
  name: string;
  usd: number;
  sharePct: number;
  color: string;
};

export type TweetSnapshot = {
  asOf: string;
  title: string;
  subtitle: string;
  sourceLabel: string;
  sourceNoteZh: string;
  totalUsd: number;
  hhi: number;
  concentrationEn: string;
  concentrationZh: string;
  rows: TweetSnapshotRow[];
};

export type StablecoinRow = {
  id: string;
  name: string;
  symbol: string;
  circulatingUsd: number;
  change: ChangeSet;
  pegMechanism: string | null;
  chains: string[];
};

export type ChainStableRow = {
  name: string;
  circulatingUsd: number;
  highlighted: boolean;
  change: ChangeSet;
};

export type KpiBlock = {
  key: string;
  labelZh: string;
  labelEn: string;
  valueUsd: number | null;
  change: ChangeSet;
  footnoteZh: string;
  live: boolean;
  proxy?: boolean;
};

export type DashboardPayload = {
  ok: boolean;
  error: string | null;
  warnings: string[];
  fetchedAt: string;
  timezone: "Asia/Shanghai";
  cacheSeconds: number;
  kpis: {
    equityAum: KpiBlock;
    robinhoodEquity: KpiBlock;
    globalStables: KpiBlock;
    rhStables: KpiBlock;
    rhChainTvl: KpiBlock;
  };
  issuers: IssuerRow[];
  equityTotalUsd: number;
  equityHhi: number;
  equityConcentrationZh: string;
  equityConcentrationEn: string;
  equityHistory: SeriesPoint[];
  tweetSnapshot: TweetSnapshot;
  stables: {
    top: StablecoinRow[];
    byChain: ChainStableRow[];
    globalHistory: SeriesPoint[];
    rhHistory: SeriesPoint[];
  };
  sources: {
    endpoints: { name: string; url: string; noteZh: string }[];
    rwaXyzConfigured: boolean;
  };
};
