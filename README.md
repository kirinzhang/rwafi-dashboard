# Equity Token Radar · 代币化美股 & 稳定币看板

Live monitoring dashboard for **tokenized US equity AUM** (DefiLlama protocol TVL) and **stablecoin issuance**, including Robinhood Chain. Inspired by Haotian ([@tmel0211](https://x.com/tmel0211)): the lasting signal for a Robinhood Chain summer is growth in tokenized stock AUM — the way DeFi Summer watched TVL — not meme launchpad market caps.

中文界面；发行方 / ticker 保留英文。**不是投资建议。**

## What it monitors / 监控什么

| Panel | 说明 |
| --- | --- |
| Hero KPIs | 追踪发行方代币化美股 AUM 合计、Robinhood 股权代币（无免费实时源时标明）、全球美元稳定币流通、RH Chain 稳定币流通、RH Chain DeFi TVL（明确标注 **不是** 股权 AUM） |
| Issuer market share | 横向条形图 + HHI 集中度，来自实时协议 TVL |
| Tweet snapshot | 2026-09-06 截图数字（Ondo / Backed / Binance / Reality / Robinhood / Backpack / Dinari / Others，合计约 $2.94B）仅作对照，**不当作实时数据** |
| Platforms table | 发行方、TVL、链、7d/30d、DefiLlama / 官网链接、更新时间（Asia/Shanghai） |
| Stablecoins | `stablecoincharts/all` 趋势、Top 稳定币、按链（高亮 ETH / SOL / TRON / Base / Arbitrum / **Robinhood Chain**）、RH Chain 历史 |

## Run locally / 本地运行

需要 Node 20+。无需 API Key。

```bash
npm install
npm run dev
```

开发服务器：`http://127.0.0.1:43173`

```bash
npm run build
npm start
```

## Data sources / 数据源（全部免费）

Server Route Handlers proxy and cache (`revalidate` 10 minutes). Client auto-refreshes every 5 minutes.

**Stablecoins**

- `https://stablecoins.llama.fi/stablecoins?includePrices=true`
- `https://stablecoins.llama.fi/stablecoinchains`
- `https://stablecoins.llama.fi/stablecoincharts/all`
- `https://stablecoins.llama.fi/stablecoincharts/Robinhood%20Chain`

**Tokenized equities / RWA platforms**

- `https://api.llama.fi/protocols` — current TVL, 1d/7d, category
- `https://api.llama.fi/protocol/{slug}` — historical `tvl[]`
- Seeded slugs in [`data/issuers.json`](data/issuers.json): `ondo-global-markets`, `xstocks`, `dinari`, plus `backedfi`, `prestocks`, `openstock`, and auto-discover of RWA names matching stock/equity/xstock
- `https://api.llama.fi/v2/chains` — Robinhood Chain `chainId` 4663 as **DeFi TVL context only**

Add an issuer by appending a slug + display name in `data/issuers.json`.

## Methodology caveats / 口径

- **DefiLlama protocol TVL ≠ rwa.xyz issuer AUM.** Numbers will diverge. xStocks’ DefiLlama *RWA platform* On-chain AUM may also sit above the protocol endpoint used here for automation.
- Binance, Reality, Robinhood’s equity book, and Backpack Securities are **not invented** when no free live feed exists. They appear only on the static tweet-snapshot card (2026-09-06).
- Live HHI is computed only on issuers we can fetch. It is often *more* concentrated than the rwa.xyz-style chart that includes those missing books.
- `RWA_XYZ_API_KEY` in `.env.example` is an unused stub for a future paid upgrade.

## Deploy on Vercel

1. Import the repo in Vercel (Next.js preset).
2. Build command: `npm run build`. Output: default `.next`.
3. No environment variables required.
4. Optional later: set `RWA_XYZ_API_KEY` — the MVP still will not call it until a client is wired.

Region: any. Refresh timezone labels are `Asia/Shanghai`.
