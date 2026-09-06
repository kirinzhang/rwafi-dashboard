export function ThesisStrip() {
  return (
    <aside className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-4 sm:px-6">
      <p className="text-[11px] font-medium tracking-wide text-emerald-300 uppercase">论点条 · Thesis</p>
      <p className="mt-2 max-w-5xl text-sm leading-relaxed text-foreground/90">
        本看板把<strong>代币化美股 AUM</strong>当作 Robinhood Chain
        夏天的指南针——呼应 Haotian（
        <a
          href="https://x.com/tmel0211"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-300 underline-offset-2 hover:underline"
        >
          @tmel0211
        </a>
        ）的判断：可复利的信号是股权代币规模增长（类似 DeFi Summer 看
        TVL），而不是 meme 发射台市值。数据仅供研究对照，<strong>不构成投资建议</strong>。
      </p>
    </aside>
  );
}
