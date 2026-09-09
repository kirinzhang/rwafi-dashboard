import type { DailyPoint, LaunchpadAllocation } from "./launchpad-types";

type AllocationInput = {
  padId: string;
  llamaHolders: DailyPoint[];
  llamaHoldersNoteZh: string | null;
  stonkfun?: {
    holdersHistory: DailyPoint[];
    totalBuybackUsd: number | null;
    totalBurnValueUsd: number | null;
    totalRevenueUsd: number | null;
    historyNoteZh: string | null;
  } | null;
};

const DOCS = {
  stonkfunDev: "https://www.stonkfun.xyz/developers",
  stonkfunRevenue: "https://www.stonkfun.xyz/api/public/v1/revenue",
  stonkfunHistory: "https://www.stonkfun.xyz/api/public/v1/revenue/history",
  llamaPonsV2: "https://api.llama.fi/summary/fees/pons-v2?dataType=dailyRevenue",
  llamaPonsV1: "https://api.llama.fi/summary/fees/pons-v1?dataType=dailyHoldersRevenue",
  llamaPump: "https://api.llama.fi/summary/fees/pump.fun?dataType=dailyHoldersRevenue",
  llamaStonk: "https://api.llama.fi/summary/fees/stonkfun?dataType=dailyHoldersRevenue",
  llamaFour: "https://api.llama.fi/summary/fees/four.meme?dataType=dailyRevenue",
  llamaFlap: "https://api.llama.fi/summary/fees/flap-sh?dataType=dailyRevenue",
};

function emptyChart(reason: string): Pick<
  LaunchpadAllocation,
  "chartKind" | "chartTitleZh" | "chartNoteZh" | "cumulativeUsd" | "cumulativeLabelZh" | "missingChartZh" | "series" | "extraTotals"
> {
  return {
    chartKind: null,
    chartTitleZh: "已执行回购 / 销毁 / 分红",
    chartNoteZh: null,
    cumulativeUsd: null,
    cumulativeLabelZh: null,
    missingChartZh: reason,
    series: [],
    extraTotals: [],
  };
}

export function buildAllocation(input: AllocationInput): LaunchpadAllocation {
  switch (input.padId) {
    case "pons":
      return {
        policyZh:
          "创作者 vs 协议：DefiLlama Pons V2 口径是毛手续费含发射费、曲线交易费与毕业后 Uniswap v4 扫费；协议收入 = 全部发射费 + 部分交易费；供给侧 = 分给创作者的交易费、可选税、以及创作者开启时对 meme 代币的回购（不是 $PONS）。Pons V1：协议从 protocolFeeShare 抽成 + 全部 0.0005 ETH 发射费；创作者拿扣除协议收入后的交易费份额。Llama 写 V1「约 80% 协议收入用于回购销毁 $PONS」，但 dailyHoldersRevenue 量级远大于 V1 协议收入（例如同一天 holders 可到百万美元而 revenue 只有数万美元），与「收入的 80%」对不上。V2 的 dailyHoldersRevenue 返回 400。因此本页只陈述政策，不把 Llama holders 序列画成已执行 $PONS 回购。",
        citations: [
          { name: "DefiLlama Pons V2 methodology", url: DOCS.llamaPonsV2 },
          { name: "DefiLlama Pons V1 HoldersRevenue", url: DOCS.llamaPonsV1 },
        ],
        ...emptyChart(
          "无法验证已执行 $PONS 回购/销毁金额：V2 无 HoldersRevenue 适配器；V1 holders 序列与「约 80% 协议收入」口径不一致，故不绘图。",
        ),
      };
    case "pump-fun":
      return {
        policyZh:
          "pump.fun：用户费 = bonding curve 交易费（平台切片 + 创作者/返现切片）+ 毕业费 + Mayhem 费。协议收入 = Pump 的交易费切片 + 毕业费 + Mayhem。ProtocolRevenue 是回购份额之后平台留存，Llama 按时代切分（2025-07-14 前 100%、之后一度 0%、2026-04-28 起 50%）。供给侧 = 创作者费 + 交易返现。HoldersRevenue = PUMP 回购（链上销毁口径）；Llama 写明汇总了 pump 全产品回购，不会与本页发射台 ProtocolRevenue 精确相加。下图只画这条已披露的 holders 日频，不当成单一发射台精确回购账。",
        citations: [{ name: "DefiLlama pump.fun HoldersRevenue", url: DOCS.llamaPump }],
        chartKind: input.llamaHolders.length ? "buyback" : null,
        chartTitleZh: "PUMP 回购（Llama HoldersRevenue，USD）",
        chartNoteZh:
          "来源：summary/fees/pump.fun?dataType=dailyHoldersRevenue。汇总 pump 全产品，不是只含 bonding-curve 发射台。",
        cumulativeUsd: input.llamaHolders.length
          ? input.llamaHolders.reduce((sum, p) => sum + p.v, 0)
          : null,
        cumulativeLabelZh: null,
        missingChartZh: input.llamaHolders.length
          ? null
          : "DefiLlama dailyHoldersRevenue 不可用。",
        series: input.llamaHolders,
        extraTotals: input.llamaHolders.length
          ? [
              {
                label: "序列加总",
                value: input.llamaHolders.reduce((sum, p) => sum + p.v, 0),
                note: "可用日频加总，非官方 lifetime；含 pump 全产品",
              },
            ]
          : [],
      };
    case "stonkfun": {
      const firstParty = input.stonkfun?.holdersHistory ?? [];
      const series = firstParty.length ? firstParty : input.llamaHolders;
      const firstPartyOk = firstParty.length > 0;
      return {
        policyZh:
          "stonk.fun Burn & Earn：官方开发者文档写明，标准 1% 池手续费 50/50（创作者 0.5%，平台 0.5%）；可选 2% 档创作者 1.5%、平台仍 0.5%。Reward 模式走 1% 池 + 向持有人征收转账税，创作者没有手续费仓位。LaunchLab 路径由平台收取曲线 1% 再把创作者份额自动转出。GET /revenue/history：dailyRevenue 是领入国库的报价资产手续费（按领取时估值）；dailyHoldersRevenue 是其中用于买回平台币并销毁的支出；dailyProtocolRevenue 是剩余。创作者与奖励持有人从 Raydium 直接领取的费用不含在该国库序列。下图用官方日频 holders 支出；累计买回/销毁取自 GET /revenue，不是把费用当成交量。",
        citations: [
          { name: "StonkFun developers（费率拆分）", url: DOCS.stonkfunDev },
          { name: "GET /api/public/v1/revenue", url: DOCS.stonkfunRevenue },
          { name: "GET /api/public/v1/revenue/history", url: DOCS.stonkfunHistory },
          { name: "DefiLlama StonkFun HoldersRevenue（对照）", url: DOCS.llamaStonk },
        ],
        chartKind: series.length ? "buyback" : null,
        chartTitleZh: firstPartyOk
          ? "Burn & Earn 买回销毁支出（官方 dailyHoldersRevenue，USD）"
          : "STONK 买回支出（Llama HoldersRevenue 回退，USD）",
        chartNoteZh: firstPartyOk
          ? (input.stonkfun?.historyNoteZh ?? null)
          : "官方 /revenue/history 失败，回退 DefiLlama HoldersRevenue（Jupiter 买回 STONK 的报价支出）。",
        cumulativeUsd: firstPartyOk
          ? input.stonkfun?.totalBuybackUsd ?? null
          : series.length
            ? series.reduce((sum, p) => sum + p.v, 0)
            : null,
        cumulativeLabelZh: null,
        missingChartZh: series.length ? null : "官方 /revenue/history 与 Llama HoldersRevenue 均无日频。",
        series,
        extraTotals: [
          {
            label: "累计买回支出",
            value: input.stonkfun?.totalBuybackUsd ?? null,
            note: "GET /revenue revenue.totalBuybackUsd",
          },
          {
            label: "累计销毁时估值",
            value: input.stonkfun?.totalBurnValueUsd ?? null,
            note: "burns.totalValueUsdAtBurn（销毁时价，不等于买回支出）",
          },
          {
            label: "累计国库手续费",
            value: input.stonkfun?.totalRevenueUsd ?? null,
            note: "revenue.totalRevenueUsd；不含创作者直接领取",
          },
        ],
      };
    }
    case "four-meme":
      return {
        policyZh:
          "four.meme：Llama 口径 Fees = 用户为发射/交易支付的全部费用；Revenue = 协议留存。没有 HoldersRevenue 适配器（HTTP 400），公开方法里也没有可验证的平台币回购/销毁日频。本页只陈述分成政策，不画已执行回购。",
        citations: [{ name: "DefiLlama four.meme methodology", url: DOCS.llamaFour }],
        ...emptyChart("four.meme 无 dailyHoldersRevenue，也没有已验证的回购/销毁地址序列。"),
      };
    case "flap-sh":
      return {
        policyZh:
          "Flap.sh：Fees = 进入 Flap fee Safe 的协议收入 + 分给营销/金库/持有人分红的代币税。Revenue / ProtocolRevenue = 任何发送方打进 fee Safe 的报价资产（含 WBNB 等包装原生资产）。供给侧 = 代币税中不进 Safe 的部分：V1 TaxSplitter 受益人、V2/V3 TaxProcessor 的市场与分红桶。Llama 无 HoldersRevenue 日频，因此分红政策可写，已执行分红/回购金额无法从免费接口验证。",
        citations: [{ name: "DefiLlama flap-sh methodology", url: DOCS.llamaFlap }],
        ...emptyChart("Flap 分红走 TaxProcessor 桶，Llama 无 holders 日频 USD，不编造累计分红。"),
      };
    case "long-xyz":
      return {
        policyZh:
          "Long.xyz：检索 DefiLlama fees / dexs / protocols 均无适配器，官网也没有可自动抓取的分成或回购披露。创作者/协议比例、买回与销毁均为 —。",
        citations: [],
        ...emptyChart("无 DefiLlama 适配器，也无已验证的回购/销毁序列。"),
      };
    default:
      return {
        policyZh: "该发射台尚未整理公开分成说明。",
        citations: [],
        ...emptyChart("无已验证序列。"),
      };
  }
}
