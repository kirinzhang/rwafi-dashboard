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
  grossFees: WindowMetric;
  protocolRevenue: WindowMetric;
  creatorShareApprox: WindowMetric;
  feeMethodologyZh: string | null;
  topTokens: LaunchpadToken[];
  topTokensNoteZh: string;
  sources: { name: string; url: string }[];
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
  sources: { name: string; url: string; noteZh: string }[];
};
