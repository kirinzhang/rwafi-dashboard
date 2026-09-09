export type RangeKey = "d30" | "d60" | "d90" | "all";

export const RANGE_OPTIONS: { key: RangeKey; days: number | null; label: string }[] = [
  { key: "d30", days: 30, label: "最近 30 天" },
  { key: "d60", days: 60, label: "最近 60 天" },
  { key: "d90", days: 90, label: "最近 90 天" },
  { key: "all", days: null, label: "全部" },
];

export type DailyPoint = {
  t: number;
  v: number;
};

export type WindowMetric = {
  d30: number | null;
  d60: number | null;
  d90: number | null;
  all: number | null;
  missing: Partial<Record<RangeKey, string>>;
  series: DailyPoint[];
};

export type LaunchpadToken = {
  name: string;
  symbol: string;
  mcapUsd: number | null;
  fdvUsd: number | null;
  volume24h: number | null;
  network: string;
  poolAddress: string;
  url: string;
};

export type LaunchpadActivityStat = {
  label: string;
  value: string;
  hint?: string;
};

export type LaunchpadAllocationTotal = {
  label: string;
  value: number | null;
  note?: string;
};

export type LaunchpadAllocation = {
  policyZh: string;
  citations: { name: string; url: string }[];
  chartKind: "buyback" | "burn" | "dividend" | null;
  chartTitleZh: string;
  chartNoteZh: string | null;
  cumulativeUsd: number | null;
  cumulativeLabelZh: string | null;
  missingChartZh: string | null;
  series: DailyPoint[];
  extraTotals: LaunchpadAllocationTotal[];
};

export type LaunchpadCard = {
  id: string;
  displayName: string;
  chainId: string;
  primary: boolean;
  color: string;
  url: string;
  defillamaUrl: string;
  noteZh: string;
  volume: WindowMetric;
  volumeNoteZh: string | null;
  volume24hUsd: number | null;
  volume24hNoteZh: string | null;
  grossFees: WindowMetric;
  protocolRevenue: WindowMetric;
  creatorShareApprox: WindowMetric;
  feeMethodologyZh: string | null;
  allocation: LaunchpadAllocation;
  activity: LaunchpadActivityStat[] | null;
  firstPartyAt: string | null;
  firstPartyAtNoteZh: string | null;
  topTokens: LaunchpadToken[];
  topTokensNoteZh: string;
  sources: { name: string; url: string }[];
};

export type PeRow = {
  padId: string;
  displayName: string;
  chainId: string;
  chainName: string;
  tokenSymbol: string | null;
  numeratorKind: "circulating_mcap" | "fdv" | "first_party_mcap" | null;
  numeratorUsd: number | null;
  numeratorMissingZh: string | null;
  rev7d: number | null;
  avgDaily7d: number | null;
  pe7d: number | null;
  rev30d: number | null;
  avgDaily30d: number | null;
  pe30d: number | null;
  missingZh: string | null;
  sourceZh: string;
};

export type PeDefinition = {
  titleZh: string;
  formulaZh: string;
  pe7dZh: string;
  pe30dZh: string;
  caveatZh: string;
};

export type LaunchpadChain = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  launchpads: LaunchpadCard[];
};

export type LaunchpadsPayload = {
  ok: boolean;
  error: string | null;
  warnings: string[];
  fetchedAt: string;
  timezone: "Asia/Shanghai";
  duneConfigured: boolean;
  duneBoards: { title: string; url: string; noteZh: string }[];
  chains: LaunchpadChain[];
  peDefinition: PeDefinition;
  peTable: PeRow[];
  sources: { name: string; url: string; noteZh: string }[];
};
