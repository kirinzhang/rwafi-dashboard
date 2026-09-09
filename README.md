# Equity Token Radar · 代币化美股看板

Live monitoring dashboard for **tokenized US equity AUM** (DefiLlama protocol TVL), **stablecoin issuance**, and **meme launchpads**. Inspired by Haotian ([@tmel0211](https://x.com/tmel0211)): the lasting signal for a Robinhood Chain summer is growth in tokenized stock AUM — the way DeFi Summer watched TVL — not meme launchpad market caps.

中文界面；发行方 / ticker 保留英文。**不是投资建议。**

## Routes / 三个页面

Top-left nav switches pages. Deep links work.

| Path | Label | 内容 |
| --- | --- | --- |
| `/` | **美股代币** | 股权 AUM KPI、堆叠发行量图（按发行方 / 按股票）、发行方市占、推文快照、平台表。不含稳定币主面板。 |
| `/stablecoins` | **稳定币** | 全球与 Robinhood Chain 稳定币 KPI、趋势、Top 币种、按链拆分。 |
| `/launchpads` | **发射台** | RH（Pons、Long.xyz）、Solana（stonk.fun、pump.fun）、BSC（four.meme、Flap.sh）；30/60/90 天日频柱状图。 |

## What it monitors / 监控什么

| Panel | 页面 | 说明 |
| --- | --- | --- |
| Hero KPIs | 美股代币 | 追踪发行方代币化美股 AUM 合计、Robinhood 股权代币（无免费实时源时标明）、RH Chain DeFi TVL（明确标注 **不是** 股权 AUM） |
| Stacked issuance | 美股代币 | 按日堆叠柱，维度切换：**按发行方**（Top 10 +「其他」，Y = 协议 TVL）或 **按股票**（Top 10 TradFi ticker +「其他」，Y = `tokensInUsd`） |
| Issuer market share | 美股代币 | 横向条形图 + HHI 集中度，来自实时协议 TVL |
| Tweet snapshot | 美股代币 | 2026-09-06 截图数字仅作对照，**不当作实时数据** |
| Platforms table | 美股代币 | 发行方、TVL、链、7d/30d、DefiLlama / 官网链接、更新时间（Asia/Shanghai） |
| Stablecoins | 稳定币 | `stablecoincharts/all` 趋势、Top 稳定币、按链（高亮 ETH / SOL / TRON / Base / Arbitrum / **Robinhood Chain**）、RH Chain 历史 |
| Launchpads | 发射台 | 日频柱状图 + 窗口合计 |

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

**Tokenized equities** (`/` · `/api/dashboard`)

- `https://api.llama.fi/protocols` — current TVL, 1d/7d, category
- `https://api.llama.fi/protocol/{slug}` — historical `tvl[]` (`totalLiquidityUSD`) **and** `tokensInUsd[]` (per-token USD)
- Seeded slugs in [`data/issuers.json`](data/issuers.json): `ondo-global-markets`, `xstocks`, `dinari`, plus `backedfi`, `prestocks`, `openstock`, and auto-discover of RWA names matching stock/equity/xstock
- `https://api.llama.fi/v2/chains` — Robinhood Chain `chainId` 4663 as **DeFi TVL context only**

**Stock-dimension stacked bars**

Same protocol JSON. No extra paid feed. Mapping:

- Ondo: strip trailing `ON` (`AAPLON` → `AAPL`)
- xStocks: strip trailing `X` (`TSLAX` → `TSLA`)
- BackedFi: strip leading `B` (`BNVDA` → `NVDA`)
- Cash (`USD`, `USDT`, `USDC`, `USD+`, symbols starting `USD`) and unrecognized tokens → 「其他」
- Days/issuers with TVL but no `tokensInUsd` → residual in 「其他」
- Ranking: Top 10 tickers by **latest mapped day** share; remainder + unmapped → 「其他」
- **Never** allocate an issuer’s total TVL across tickers. If a protocol only reports cash (Dinari `USD+`, OpenStock `USDT`) or has no token history (PreStocks), that residual stays in 「其他」 or the stock mode shows an empty state when nothing maps.

Add an issuer by appending a slug + display name in `data/issuers.json`.

**Stablecoins** (`/stablecoins` · `/api/stablecoins`)

- `https://stablecoins.llama.fi/stablecoins?includePrices=true`
- `https://stablecoins.llama.fi/stablecoinchains`
- `https://stablecoins.llama.fi/stablecoincharts/all`
- `https://stablecoins.llama.fi/stablecoincharts/Robinhood%20Chain`

**Launchpads** (`/launchpads` · `/api/launchpads` · [`data/launchpads.json`](data/launchpads.json))

- Fees: `https://api.llama.fi/summary/fees/{slug}?dataType=dailyFees` (gross) and `?dataType=dailyRevenue` (protocol keep)
- Volume: `https://api.llama.fi/summary/dexs/{slug}`
- 30/60/90-day totals **and daily bar charts**: sum / plot `totalDataChart` (or chain `totalDataChartBreakdown`). Missing calendar days in the window are drawn as 0, not interpolated. If the daily series is shorter than the window, the **total** is **—** (no extrapolation). 30d may fall back to DefiLlama `total30d` when the chart is missing.
- Top-5 sample: GeckoTerminal `https://api.geckoterminal.com/api/v2/networks/{network}/dexes/{dex}/pools`
- Dune boards are cited as **reference links only**. Live numbers do not come from Dune unless you later wire `DUNE_API_KEY`.

Slugs used: `pons-v2`, `pons-v1`, `stonkfun`, `pump.fun`, `four.meme`, `flap-sh`. Long.xyz has **no** DefiLlama adapter (`long` / `long-xyz` / `longxyz` / `long.xyz` all 404) — metrics show —.

Optional env:

```bash
DUNE_API_KEY=   # unused by the live fetch path; dashboard links still render
```

## Methodology caveats / 口径

- **DefiLlama protocol TVL ≠ rwa.xyz issuer AUM.** Numbers will diverge. xStocks’ DefiLlama *RWA platform* On-chain AUM may also sit above the protocol endpoint used here for automation.
- Binance, Reality, Robinhood’s equity book, and Backpack Securities are **not invented** when no free live feed exists. They appear only on the static tweet-snapshot card (2026-09-06).
- Live HHI is computed only on issuers we can fetch. It is often *more* concentrated than the rwa.xyz-style chart that includes those missing books.
- Per-ticker history is only as complete as DefiLlama `tokensInUsd`. Gaps are 「其他」, never fabricated stock series.
- `RWA_XYZ_API_KEY` in `.env.example` is an unused stub for a future paid upgrade.

## Deploy on Vercel

1. Import the repo in Vercel (Next.js preset).
2. Build command: `npm run build`. Output: default `.next`.
3. No environment variables required.
4. Optional later: `RWA_XYZ_API_KEY` (equity page, unused) or `DUNE_API_KEY` (launchpads still do not query Dune until a client is wired).

Region: any. Refresh timezone labels are `Asia/Shanghai`.
