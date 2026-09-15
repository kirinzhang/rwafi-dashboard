# Equity Token Radar · 代币化美股看板

Live monitoring dashboard for **tokenized US equity AUM** (DefiLlama protocol TVL), **stablecoin issuance**, **meme launchpads**, and **Robinhood Chain Stock Token LPs**. Inspired by Haotian ([@tmel0211](https://x.com/tmel0211)): the lasting signal for a Robinhood Chain summer is growth in tokenized stock AUM — the way DeFi Summer watched TVL — not meme launchpad market caps.

中文界面；发行方 / ticker 保留英文。**不是投资建议。**

## Routes / 四个页面

Top-left nav switches pages. Deep links work.

| Path | Label | 内容 |
| --- | --- | --- |
| `/` | **美股代币** | 股权 AUM KPI、堆叠发行量图（按发行方 / 按股票）、发行方市占、推文快照、平台表。不含稳定币主面板。 |
| `/stablecoins` | **稳定币** | 全球与 Robinhood Chain 稳定币 KPI、趋势、Top 币种、按链拆分。 |
| `/launchpads` | **发射台** | RH（Pons、Long.xyz）、Solana（stonk.fun、pump.fun）、BSC（four.meme、Flap.sh）；30/60/90/全部 日频柱。 |
| `/rh-lp` | **RH LP** | 官方 Stock Token / USDG 与 Stock / ETH（WETH）池监控 + 满档费用 vs 无常损失回测。 |

## What it monitors / 监控什么

| Panel | 页面 | 说明 |
| --- | --- | --- |
| Hero KPIs | 美股代币 | 追踪发行方代币化美股 AUM 合计、Robinhood 股权代币（无免费实时源时标明）、RH Chain DeFi TVL（明确标注 **不是** 股权 AUM） |
| Stacked issuance | 美股代币 | 按日堆叠柱，维度切换：**按发行方**（Top 10 +「其他」，Y = 协议 TVL）或 **按股票**（Top 10 TradFi ticker +「其他」，Y = `tokensInUsd`） |
| Issuer market share | 美股代币 | 横向条形图 + HHI 集中度，来自实时协议 TVL |
| Tweet snapshot | 美股代币 | 2026-09-06 截图数字仅作对照，**不当作实时数据** |
| Platforms table | 美股代币 | 发行方、TVL、链、7d/30d、DefiLlama / 官网链接、更新时间（Asia/Shanghai） |
| Stablecoins | 稳定币 | DefiLlama 风格总市值、USDT 占比、历史面积图、Top 25 币种、按链条形图、RH Chain 历史 |
| Launchpads | 发射台 | 日频柱；窗口 **30 / 60 / 90 / 全部**（全部为完整序列，过长则周加总） |
| Stock LP | RH LP | 官方 Stock Token × USDG / WETH 最深池：TVL、24h 量、Vol/TVL、毛估费用 APR、链上相对 RH 官方价溢价；7/30/90 日满档回测 |

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

Same protocol JSON and **the same daily TVL total** as the issuer stack. Mapping:

- Last `tokensInUsd` snapshot per UTC day (do not add intra-day points onto the daily bar)
- Ondo: strip trailing `ON`, including 2-letter tickers (`MUON` → `MU`, `AAPLON` → `AAPL`)
- xStocks: strip trailing `X` (`TSLAX` → `TSLA`, `CRCLX` → `CRCL`)
- BackedFi: strip leading `B` (`BNVDA` → `NVDA`); bond-like symbols with digits stay in 「其他」
- Cash / yield (USDON, USDC, USDT, **USYC**, USD+, symbols containing `USD`) → 「其他」, never a stock slice
- `CRCL` is NYSE Circle Internet Group **equity** (CRCLON / CRCLX), not Circle stablecoins
- Unmapped residual = that issuer’s TVL − mapped tickers, so issuer-mode and stock-mode totals match
- Ranking: Top 10 tickers by latest mapped day share; remainder + unmapped → 「其他」

Add an issuer by appending a slug + display name in `data/issuers.json`.

**Stablecoins** (`/stablecoins` · `/api/stablecoins`)

- `https://stablecoins.llama.fi/stablecoins?includePrices=true`
- `https://stablecoins.llama.fi/stablecoinchains`
- `https://stablecoins.llama.fi/stablecoincharts/all`
- `https://stablecoins.llama.fi/stablecoincharts/Robinhood%20Chain`

**Launchpads** (`/launchpads` · `/api/launchpads` · [`data/launchpads.json`](data/launchpads.json))

- Fees: `https://api.llama.fi/summary/fees/{slug}?dataType=dailyFees` (gross) and `?dataType=dailyRevenue` (protocol keep)
- Volume (pads with a Llama DEX adapter): `https://api.llama.fi/summary/dexs/{slug}`
- 30/60/90-day totals **and daily bar charts**: sum / plot `totalDataChart`. Missing calendar days in the window are 0, not interpolated. If the daily series is shorter than the window, the **total** is **—**. 30d may fall back to DefiLlama `total30d` when the chart is missing.
- **全部**: sum the full available daily series. Bars plot every calendar day in that span; if there are more than 160 days, bars are **weekly sums** (documented on the chart).
- **stonk.fun** (docs [stonkfun.xyz/developers](https://www.stonkfun.xyz/developers), base `https://www.stonkfun.xyz/api/public/v1`, no key). Audited **all documented GET reads**:
  - **Filled:** `/stats` (`totalVolume24hUsd`, token counts, platform mcap); `/tokens?sort=marketCap&page=1&pageSize=5` (Top 5); `/tokens/{STONK}` (platform-token mcap for PE); `/tokens/{STONK}/burns` (STONK burn totals); `/revenue` (lifetime buyback/burn/treasury); `/revenue/history` (`dailyRevenue` → PE 7d/30d + protocol-revenue bars; `dailyHoldersRevenue` → Burn & Earn chart); `/launches` (`pagination.total`); `/pairs?launchable=true` (pair count). Timestamp = max `meta.generatedAt`.
  - **Volume history:** `/tokens` paginates (~26k / pageSize 1–100) but each row only has `market.volume24hUsd` — no daily history. Summing pages would only rebuild the `/stats` 24h snapshot; we do **not** paginate the catalog or mix snapshots. No `/volume` endpoint. `/revenue/history` is **not** volume. 30/60/90/全部 volume stay **—**.
  - **Not used as metrics:** `/total-assets` (identity only, no market data); `/tokens/{mint}/rewards` (STONK is standard / `rewards: null`); `/tokens/{mint}/airdrop` (null); `/tokens/{mint}/backing` (400, pump launches only); `/rewards` (per-coin distributions, not platform PE); POST launch/claim endpoints.
  - Bitquery unused (per-pool, OAuth). Optional `BITQUERY_API_KEY` still does not proxy fees as volume.
- **Trailing PE table** (cross-chain, above the chain tabs):
  - `PE = circulating mcap ÷ (period-average daily protocol revenue × 365)`
  - `PE 7d = mcap / (Rev7d / 7 × 365)` · `PE 30d = mcap / (Rev30d / 30 × 365)`
  - Numerator: CoinGecko circulating mcap (`pump-fun`, `pons`, `four`). **stonk.fun** uses official `GET /tokens/{STONK}` `market.marketCapUsd` (labeled 官方市值). Long.xyz / Flap.sh → **—**.
  - Denominator: DefiLlama `total7d` / `total30d` except **stonk.fun** = sum of official `/revenue/history` `dailyRevenue`.
- **Revenue allocation**: policy text per pad from Llama methodology + StonkFun docs. Executed buyback/burn **charts only when a verifiable series exists**:
  - pump.fun: Llama `dailyHoldersRevenue` (PUMP buyback; Llama says this aggregates all pump products)
  - stonk.fun: first-party `/revenue/history` `dailyHoldersRevenue` plus `/revenue` totals and `/tokens/{STONK}/burns`
  - Pons / four.meme / Flap / Long.xyz: policy only; chart **—**
- Top-5: GeckoTerminal pools except **stonk.fun** (official `/tokens?sort=marketCap`)
- Dune boards are cited as **reference links only**. Live numbers do not come from Dune unless you later wire `DUNE_API_KEY`.

Slugs used: `pons-v2`, `pons-v1`, `stonkfun`, `pump.fun`, `four.meme`, `flap-sh`. Long.xyz has **no** DefiLlama adapter (`long` / `long-xyz` / `longxyz` / `long.xyz` all 404) — metrics show —.

Optional env:

```bash
DUNE_API_KEY=       # unused by the live fetch path; dashboard links still render
BITQUERY_API_KEY=   # unused; StonkFun first-party /stats covers 24h volume
```

**Robinhood Stock LP** (`/rh-lp` · `/api/rh-lp` · `/api/rh-lp/backtest` · [`data/rh-lp.json`](data/rh-lp.json))

Strategy the page encodes: when stock-paired memes heat up on Robinhood Chain, LP **canonical Stock Tokens vs USDG or WETH**, not the meme.

- Chain: EIP-155 **4663**. DexScreener / GeckoTerminal / DexPaprika network slug is **`robinhood`**, not `4663`.
- Quote legs (re-verified 2026-09-15 against [docs.robinhood.com/chain/contracts](https://docs.robinhood.com/chain/contracts) and `GET https://api.robinhood.com/rhj/assets` `chainId==4663`):
  - WETH `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`
  - USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (6 decimals)
- Seed tickers: NVDA, HIMS, AAPL, TSLA, MU, LLY, SPY, SPCX, plus mega-caps MSFT/AMZN/GOOGL/META/NFLX/AMD/AVGO/INTC. **HOOD is not in the official asset list** — the UI says so and does not invent an address. Pool matching is by **contract address**, not ticker string (fake USDG / ticker squatters are dropped).
- Live pools: `https://api.dexscreener.com/token-pairs/v1/robinhood/{token}`. Each seed × quote keeps the **deepest TVL** pool only. Example deep pool: NVDA/USDG Uni v3 `0xd4EB21209C4D6093f80B5B84f5C45cc093EA14a3`.
- Fee tier: GeckoTerminal `pools/multi` `pool_fee_percentage` (or `%` in pool name). Unknown fee → APR **—**, never a guessed 0.05%.
- Illustrative fee APR = `(volume24h * feeRate / TVL) * 365`, labeled **全池毛估，不是你的 LP APR**.
- Premium/discount: Dex on-chain `priceUsd` vs Robinhood `GET /rhj/prices/{SYMBOL}` mid `(bid+ask)/2`. Live only; no official historical print.
- Backtest (`/api/rh-lp/backtest?pair=0x…&window=d7|d30|d90`): GeckoTerminal daily OHLCV (`currency=usd`, `token=base|quote`). If that series is missing and the quote is USDG, fall back to DexPaprika `GET /networks/robinhood/pools/{pool}/ohlcv?start=YYYY-MM-DD&interval=24h`. **If fewer than two daily closes exist, the UI shows 历史不足 — it does not fabricate candles from the 24h snapshot.**
- Backtest model (v1, labeled): full-range Uniswap v2-style. Start **$1 stock + $1 quote**. LP (pre-fee) = `2 * sqrt(stockReturn * quoteReturn)`. Fees ≈ `sum(dayVolume * feeRate * ($2 / currentTVL))` with **constant share of live TVL** (historical TVL is not published on these free endpoints). Fees are **not compounded** back into the pool. Benchmarks: HODL 50/50 and Hold USDG ($2 cash). Concentrated-liquidity exact backtest is out of scope.
- As of 2026-09-15 the NVDA/USDG v3 pool had ~57 daily GT candles (pool created 2026-07-21), so 7d/30d work and 90d is truncated to available history.

## Methodology caveats / 口径

- **DefiLlama protocol TVL ≠ rwa.xyz issuer AUM.** Numbers will diverge. xStocks’ DefiLlama *RWA platform* On-chain AUM may also sit above the protocol endpoint used here for automation.
- Binance, Reality, Robinhood’s equity book, and Backpack Securities are **not invented** when no free live feed exists. They appear only on the static tweet-snapshot card (2026-09-06).
- Live HHI is computed only on issuers we can fetch. It is often *more* concentrated than the rwa.xyz-style chart that includes those missing books.
- Per-ticker history is only as complete as DefiLlama `tokensInUsd`. Same-day intra-day snapshots are **not** added together. Gaps and non-equity tokens are 「其他」, never fabricated stock series. CRCL in the stock stack is tokenized Circle **equity**, not USDC/USYC.
- `/rh-lp` fee APR is a **gross pool** estimate from 24h volume; it is not LP wallet APR. Backtests are full-range volume-share proxies. Missing OHLCV → empty state, not interpolated series.
- `RWA_XYZ_API_KEY` in `.env.example` is an unused stub for a future paid upgrade.

## Deploy on Vercel

1. Import the repo in Vercel (Next.js preset).
2. Build command: `npm run build`. Output: default `.next`.
3. No environment variables required.
4. Optional later: `RWA_XYZ_API_KEY` (equity page, unused) or `DUNE_API_KEY` (launchpads still do not query Dune until a client is wired).

Region: any. Refresh timezone labels are `Asia/Shanghai`.
