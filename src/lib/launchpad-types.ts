export type PeriodUsd = {
  h24: number | null;
  d7: number | null;
  d30: number | null;
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
  volume: PeriodUsd;
  volumeNoteZh: string | null;
  grossFees: PeriodUsd;
  protocolRevenue: PeriodUsd;
  creatorShareApprox: PeriodUsd;
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

export type LaunchpadComparisonRow = {
  id: string;
  displayName: string;
  chainId: string;
  fees24h: number | null;
  revenue24h: number | null;
  volume24h: number | null;
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
  comparison: LaunchpadComparisonRow[];
  sources: { name: string; url: string; noteZh: string }[];
};
