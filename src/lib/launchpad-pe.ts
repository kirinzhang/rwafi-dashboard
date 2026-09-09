import type { EquityMcap } from "./launchpad-mcap";
import type { DailyPoint, PeDefinition, PeRow } from "./launchpad-types";
import { windowTotal } from "./launchpad-windows";

type LlamaTotals = {
  total7d?: number | null;
  total30d?: number | null;
};

export const PE_DEFINITION: PeDefinition = {
  titleZh: "滚动市盈率（协议收入 run-rate）",
  formulaZh:
    "PE = 流通市值 ÷（期间日均协议收入 × 365）。优先用 CoinGecko 流通市值；stonk.fun 用官方 GET /tokens/{STONK} 的 marketCapUsd。没有流通市值时用 FDV 并在「市值口径」列标注。协议收入默认 DefiLlama dailyRevenue（Pons 为 V1+V2）；stonk.fun 用官方 /revenue/history 的 dailyRevenue。",
  pe7dZh: "PE 7d = 市值 / (Rev 7d ÷ 7 × 365)",
  pe30dZh: "PE 30d = 市值 / (Rev 30d ÷ 30 × 365)",
  caveatZh:
    "这是用近期协议收入年化的 trailing PE，不是财报净利润、也不是预测。窗口内收入波动会让 7d 与 30d 差很多。缺市值或收入时显示 —，不编造。",
};

function finite(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function sumNative(summaries: Map<string, LlamaTotals>, slugs: string[], key: "total7d" | "total30d"): number | null {
  if (!slugs.length) return null;
  let sum = 0;
  let any = false;
  for (const slug of slugs) {
    const value = finite(summaries.get(slug)?.[key]);
    if (value == null) continue;
    sum += value;
    any = true;
  }
  return any ? sum : null;
}

function periodRevenue(
  summaries: Map<string, LlamaTotals>,
  slugs: string[],
  series: DailyPoint[],
  days: 7 | 30,
): { value: number | null; sourceZh: string; missingZh: string | null } {
  const nativeKey = days === 7 ? "total7d" : "total30d";
  const native = sumNative(summaries, slugs, nativeKey);
  if (native != null && native >= 0) {
    return {
      value: native,
      sourceZh: `DefiLlama summary/fees ${nativeKey}（${slugs.join(" + ") || "无 slug"}）`,
      missingZh: null,
    };
  }
  if (!slugs.length) {
    return { value: null, sourceZh: "无 DefiLlama fees slug", missingZh: "DefiLlama 未收录该发射台的 revenue 适配器。" };
  }
  const fromSeries = windowTotal(series, days);
  if (fromSeries.value != null) {
    return {
      value: fromSeries.value,
      sourceZh: `DefiLlama dailyRevenue 日频加总 ${days} 天（${slugs.join(" + ")}）`,
      missingZh: null,
    };
  }
  return {
    value: null,
    sourceZh: `DefiLlama dailyRevenue（${slugs.join(" + ")}）`,
    missingZh: fromSeries.reason ?? "协议收入不可用。",
  };
}

export function trailingPe(numeratorUsd: number, periodRevenueUsd: number, days: number): number | null {
  if (!(numeratorUsd > 0) || !(periodRevenueUsd > 0) || days <= 0) return null;
  const annualized = (periodRevenueUsd / days) * 365;
  if (!(annualized > 0)) return null;
  return numeratorUsd / annualized;
}

export function buildPeRow(input: {
  padId: string;
  displayName: string;
  chainId: string;
  chainName: string;
  tokenSymbol: string | null;
  geckoCoinId: string | null;
  feeSlugs: string[];
  revenueSummaries: Map<string, LlamaTotals>;
  revenueSeries: DailyPoint[];
  mcap: EquityMcap | null;
  firstPartyRevenue?: { rev7d: number | null; rev30d: number | null; sourceZh: string };
}): PeRow {
  const rev7 = input.firstPartyRevenue
    ? {
        value: input.firstPartyRevenue.rev7d,
        sourceZh: input.firstPartyRevenue.sourceZh,
        missingZh: input.firstPartyRevenue.rev7d == null ? "官方 /revenue/history 不足 7 天。" : null,
      }
    : periodRevenue(input.revenueSummaries, input.feeSlugs, input.revenueSeries, 7);
  const rev30 = input.firstPartyRevenue
    ? {
        value: input.firstPartyRevenue.rev30d,
        sourceZh: input.firstPartyRevenue.sourceZh,
        missingZh: input.firstPartyRevenue.rev30d == null ? "官方 /revenue/history 不足 30 天。" : null,
      }
    : periodRevenue(input.revenueSummaries, input.feeSlugs, input.revenueSeries, 30);

  let numeratorUsd: number | null = null;
  let numeratorKind: PeRow["numeratorKind"] = null;
  let numeratorMissingZh: string | null = null;
  if (input.mcap?.source === "stonkfun" && input.mcap.circulatingUsd != null) {
    numeratorUsd = input.mcap.circulatingUsd;
    numeratorKind = "first_party_mcap";
  } else if (input.mcap?.circulatingUsd != null) {
    numeratorUsd = input.mcap.circulatingUsd;
    numeratorKind = "circulating_mcap";
  } else if (input.mcap?.fdvUsd != null) {
    numeratorUsd = input.mcap.fdvUsd;
    numeratorKind = "fdv";
  } else if (!input.geckoCoinId) {
    numeratorMissingZh = "未找到可验证的平台代币 CoinGecko / GeckoTerminal 市值。";
  } else {
    numeratorMissingZh = `CoinGecko ${input.geckoCoinId} 与 GeckoTerminal 均无流通市值/FDV。`;
  }

  const avgDaily7d = rev7.value != null ? rev7.value / 7 : null;
  const avgDaily30d = rev30.value != null ? rev30.value / 30 : null;
  const pe7d = numeratorUsd != null && rev7.value != null ? trailingPe(numeratorUsd, rev7.value, 7) : null;
  const pe30d = numeratorUsd != null && rev30.value != null ? trailingPe(numeratorUsd, rev30.value, 30) : null;

  const missingParts = [
    numeratorMissingZh,
    pe7d == null && numeratorUsd != null ? rev7.missingZh : null,
    pe30d == null && numeratorUsd != null ? rev30.missingZh : null,
    pe7d == null && pe30d == null && numeratorUsd != null && (rev7.value == null || rev7.value <= 0)
      ? "期间协议收入为 0 或缺失，无法年化。"
      : null,
  ].filter(Boolean);

  const mcapSource =
    input.mcap?.source === "stonkfun"
      ? "StonkFun GET /tokens/{STONK} market.marketCapUsd"
      : input.mcap?.source === "coingecko"
        ? "CoinGecko circulating mcap"
        : input.mcap?.source === "geckoterminal"
          ? "GeckoTerminal market_cap_usd（CoinGecko 429 回退）"
          : "无市值";

  return {
    padId: input.padId,
    displayName: input.displayName,
    chainId: input.chainId,
    chainName: input.chainName,
    tokenSymbol: input.tokenSymbol,
    numeratorKind,
    numeratorUsd,
    numeratorMissingZh,
    rev7d: rev7.value,
    avgDaily7d,
    pe7d,
    rev30d: rev30.value,
    avgDaily30d,
    pe30d,
    missingZh: missingParts.length ? missingParts.join(" ") : null,
    sourceZh: [mcapSource, rev7.sourceZh, rev30.sourceZh !== rev7.sourceZh ? rev30.sourceZh : null]
      .filter(Boolean)
      .join(" · "),
  };
}
