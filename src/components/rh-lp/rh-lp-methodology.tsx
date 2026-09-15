import { formatShanghai } from "@/lib/format";

type Sources = {
  endpoints: { name: string; url: string; noteZh: string }[];
};

export function RhLpMethodology({
  sources,
  fetchedAt,
  notesZh,
}: {
  sources: Sources;
  fetchedAt: string;
  notesZh: string[];
}) {
  return (
    <footer className="space-y-3 border-t border-white/8 pt-8 pb-4 text-sm text-muted-foreground">
      <h2 className="text-foreground">方法与数据源 / Methodology</h2>
      <p>
        服务端 Route Handler 代理以上免费接口，fetch{" "}
        <code className="rounded bg-white/5 px-1">revalidate = 600</code> 秒。时间戳{" "}
        <strong>Asia/Shanghai</strong>。最近一次服务端拉取：{formatShanghai(fetchedAt)}。
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
          <strong className="text-foreground/80">策略口径：</strong>
          监测的是官方 Robinhood Stock Token 对 <strong>USDG</strong> 或{" "}
          <strong>WETH（界面称 ETH）</strong> 的池，不是 meme / 发射台币对。合约以{" "}
          <code className="rounded bg-white/5 px-1">/rhj/assets</code> chainId=4663 与{" "}
          docs.robinhood.com/chain/contracts 为准。
        </p>
        <p>
          <strong className="text-foreground/80">毛估手续费 APR：</strong>
          <code className="rounded bg-white/5 px-1">(volume24h × feeRate / TVL) × 365</code>
          。这是<strong>全池</strong>估计，未扣 LP 激励分成、未考虑集中流动性、不是你的仓位 APR。未知费率的池显示
          —，不填默认档位。
        </p>
        <p>
          <strong className="text-foreground/80">回测（v1）：</strong>
          满档恒定乘积。起始 $1 股票 + $1 报价。份额 = $2 /{" "}
          <em>当前</em> TVL（历史 TVL 序列公开接口没有，不编造）。日费 ≈ 当日成交额 × feeRate ×
          份额，费用不复投。对照：HODL 50/50、Hold USDG（$2 现金）。GeckoTerminal
          日频 OHLCV 不足时标「历史不足」，不会用 24h 快照拉出假曲线。
        </p>
        <p>
          <strong className="text-foreground/80">溢价 / 折价：</strong>
          链上 Dex 价相对 Robinhood{" "}
          <code className="rounded bg-white/5 px-1">/rhj/prices</code>{" "}
          中间价。只有实时点，没有官方价历史，回测图不含溢价序列。
        </p>
        {notesZh.map((note) => (
          <p key={note}>{note}</p>
        ))}
        <p>本项目开源研究工具，不提供交易、经纪或投资建议。</p>
      </div>
    </footer>
  );
}
