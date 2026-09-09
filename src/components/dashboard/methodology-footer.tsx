import { formatShanghai } from "@/lib/format";
import type { DashboardPayload } from "@/lib/types";

export function MethodologyFooter({
  sources,
  fetchedAt,
}: {
  sources: DashboardPayload["sources"];
  fetchedAt: string;
}) {
  return (
    <footer className="space-y-3 border-t border-white/8 pt-8 pb-4 text-sm text-muted-foreground">
      <h2 className="text-foreground">方法与数据源 / Methodology</h2>
      <p>
        服务端 Route Handler 代理以上免费接口，ISR / fetch{" "}
        <code className="rounded bg-white/5 px-1">revalidate = 600</code> 秒（10 分钟）。页面展示的
        lastUpdated 以 <strong>Asia/Shanghai</strong> 时区格式化。最近一次服务端拉取：{" "}
        {formatShanghai(fetchedAt)}。
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {sources.endpoints.map((item) => (
          <li key={item.url} className="rounded-lg border border-white/5 bg-white/2 p-3">
            <a href={item.url} className="text-sky-300 hover:underline" target="_blank" rel="noreferrer">
              {item.name}
            </a>
            <p className="mt-1 text-xs leading-relaxed">{item.noteZh}</p>
          </li>
        ))}
      </ul>
      <div className="space-y-2 text-xs leading-relaxed">
        <p>
          <strong className="text-foreground/80">口径差异：</strong>
          DefiLlama <em>protocol TVL</em> ≠ rwa.xyz 发行方 AUM。同一发行方（例如 Ondo Global Markets、xStocks /
          Backed）两边数字会分叉：协议 TVL 统计适配器覆盖的链上仓位；rwa.xyz
          可能纳入更多托管/发行账本。xStocks 的 DefiLlama RWA 平台页 On-chain AUM 也可能高于协议 endpoint。
        </p>
        <p>
          <strong className="text-foreground/80">堆叠发行量图：</strong>
          柱高 = 当日追踪发行方 DefiLlama 协议 TVL 之和。Top 10
          按最新交易日市占一次性固定（全图同一图例）；其余为「其他」。缺测日记 0。Robinhood / Binance /
          Reality / Backpack 无免费历史，不进入柱。
        </p>
        <p>
          <strong className="text-foreground/80">不会编造的行：</strong>
          Binance、Reality、Robinhood 股权账本、Backpack Securities
          目前没有免费、可自动化的实时源，因此只出现在「推文快照」卡，并标明 2026-09-06 静态截图。
        </p>
        <p>
          <strong className="text-foreground/80">Robinhood 代理指标：</strong>
          Robinhood Chain DeFi TVL（chainId 4663）与 RH Chain
          稳定币流通是链级上下文，<em>不是</em>代币化美股 AUM。
        </p>
        <p>
          rwa.xyz API key 状态：{sources.rwaXyzConfigured ? "已配置（MVP 仍未调用）" : "未配置（默认）"}。环境变量{" "}
          <code className="rounded bg-white/5 px-1">RWA_XYZ_API_KEY</code> 仅为后续升级预留。
        </p>
        <p>本项目开源研究工具，不提供交易、经纪或投资建议。</p>
      </div>
    </footer>
  );
}
