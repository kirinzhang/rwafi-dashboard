import { llamaJson, settled } from "./llama";
import {
  addrKey,
  DEXSCREENER_BASE,
  DEXSCREENER_CHAIN,
  explorerUrl,
  GECKO_NETWORK,
  GECKO_POOL_BASE,
  isQuoteAddress,
  OPTIONAL_MISSING,
  QUOTE_META,
  RH_ASSETS_URL,
  RH_CHAIN_ID,
  RH_CONTRACTS_DOCS,
  RH_PRICES_URL,
  SEED_SYMBOLS,
  UNISWAP_POOL_BASE,
} from "./rh-lp-constants";
import { fetchPublicJson } from "./rh-lp-http";
import { finite, grossFeeAprPct, parseFeeRate, positive } from "./rh-lp-math";
import type {
  QuoteLeg,
  RhAsset,
  RhLpPayload,
  RhLpPoolRow,
  RhOfficialPrice,
} from "./rh-lp-types";

type RhAssetsResponse = {
  assets?: {
    tokenSymbol?: string;
    tokenName?: string;
    tokenDecimals?: number;
    status?: string;
    logoUrl?: string;
    deployments?: { contractAddress?: string; chainId?: number; networkName?: string }[];
  }[];
};

type RhPricesResponse = {
  quotes?: {
    tokenSymbol?: string;
    bid?: string;
    ask?: string;
    generatedAt?: string;
    isTradingHalt?: boolean;
  }[];
};

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  labels?: string[];
  priceNative?: string;
  priceUsd?: string;
  pairCreatedAt?: number;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; name?: string; symbol?: string };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
};

type GtPoolAttr = {
  address?: string;
  name?: string;
  pool_fee_percentage?: string | number | null;
  reserve_in_usd?: string | number | null;
  volume_usd?: { h24?: string | number | null };
};

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

function dexLabel(dexId: string | undefined, labels: string[] | undefined): string {
  const id = (dexId ?? "").toLowerCase();
  const version = (labels ?? []).find((l) => /^v\d/i.test(l));
  if (id === "uniswap") return version ? `Uniswap ${version}` : "Uniswap";
  if (id === "up") return version ? `UP ${version}` : "UP";
  if (id === "ramses") return version ? `Ramses ${version}` : "Ramses";
  if (!id) return version ? version : "DEX";
  const pretty = id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return version ? `${pretty} ${version}` : pretty;
}

function officialPricesMid(price: RhOfficialPrice | undefined): number | null {
  if (!price) return null;
  if (price.mid != null && price.mid > 0) return price.mid;
  if (price.bid != null && price.ask != null && price.bid > 0 && price.ask > 0) {
    return (price.bid + price.ask) / 2;
  }
  return price.bid ?? price.ask;
}

async function fetchRhAssets(warnings: string[]): Promise<RhAsset[]> {
  const json = await settled("robinhood rhj/assets", llamaJson<RhAssetsResponse>(RH_ASSETS_URL), warnings);
  const seedSet = new Set(SEED_SYMBOLS);
  const out: RhAsset[] = [];
  for (const asset of json?.assets ?? []) {
    const dep = (asset.deployments ?? []).find((d) => d.chainId === RH_CHAIN_ID);
    if (!dep?.contractAddress) continue;
    const symbol = (asset.tokenSymbol ?? "").toUpperCase();
    if (!symbol) continue;
    out.push({
      symbol,
      name: asset.tokenName ?? `${symbol} • Robinhood Token`,
      address: dep.contractAddress,
      decimals: asset.tokenDecimals ?? 18,
      status: asset.status ?? "",
      logoUrl: asset.logoUrl ?? null,
      seeded: seedSet.has(symbol),
    });
  }
  return out;
}

async function fetchRhPrice(symbol: string, warnings: string[]): Promise<RhOfficialPrice | null> {
  const url = `${RH_PRICES_URL}/${encodeURIComponent(symbol)}`;
  const json = await settled(`robinhood prices ${symbol}`, llamaJson<RhPricesResponse>(url, 15_000), warnings);
  const quote = json?.quotes?.[0];
  if (!quote) return null;
  const bid = positive(quote.bid);
  const ask = positive(quote.ask);
  const mid = bid != null && ask != null ? (bid + ask) / 2 : (bid ?? ask);
  return {
    symbol,
    bid,
    ask,
    mid,
    generatedAt: quote.generatedAt ?? null,
    halted: Boolean(quote.isTradingHalt),
  };
}

async function fetchDexPairs(tokenAddress: string, warnings: string[]): Promise<DexPair[]> {
  const url = `https://api.dexscreener.com/token-pairs/v1/${DEXSCREENER_CHAIN}/${tokenAddress}`;
  const json = await settled(
    `dexscreener token-pairs ${tokenAddress.slice(0, 10)}`,
    llamaJson<DexPair[] | { pairs?: DexPair[] }>(url, 20_000),
    warnings,
  );
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.pairs)) return json.pairs;
  return [];
}

async function fetchGtFees(
  pairAddresses: string[],
  warnings: string[],
): Promise<Map<string, { feeTierPct: number | null; feeRate: number | null }>> {
  const map = new Map<string, { feeTierPct: number | null; feeRate: number | null }>();
  const unique = [...new Set(pairAddresses.map(addrKey).filter(Boolean))];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 15) chunks.push(unique.slice(i, i + 15));

  await mapLimit(chunks, 1, async (chunk) => {
    const url = `https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK}/pools/multi/${chunk.join(",")}`;
    const json = await settled(
      `geckoterminal pools/multi (${chunk.length})`,
      fetchPublicJson<{ data?: { attributes?: GtPoolAttr }[] }>(url),
      warnings,
    );
    for (const row of json?.data ?? []) {
      const attrs = row.attributes ?? {};
      if (!attrs.address) continue;
      map.set(addrKey(attrs.address), parseFeeRate(attrs.pool_fee_percentage, attrs.name));
    }
  });

  const missing = unique.filter((addr) => !map.has(addr));
  if (missing.length) {
    await mapLimit(missing, 2, async (address) => {
      const url = `https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK}/pools/${address}`;
      const json = await settled(
        `geckoterminal pool ${address.slice(0, 10)}`,
        fetchPublicJson<{ data?: { attributes?: GtPoolAttr } }>(url),
        warnings,
      );
      const attrs = json?.data?.attributes;
      if (!attrs?.address) return;
      map.set(addrKey(attrs.address), parseFeeRate(attrs.pool_fee_percentage, attrs.name));
    });
  }
  return map;
}

function classifyPair(
  pair: DexPair,
  officialByAddr: Map<string, RhAsset>,
): {
  stock: RhAsset;
  quote: QuoteLeg;
  quoteAddress: string;
  priceUsd: number | null;
  priceNative: number | null;
} | null {
  if ((pair.chainId ?? DEXSCREENER_CHAIN) !== DEXSCREENER_CHAIN) return null;
  const baseAddr = addrKey(pair.baseToken?.address);
  const quoteAddr = addrKey(pair.quoteToken?.address);
  const baseQuote = isQuoteAddress(baseAddr);
  const quoteQuote = isQuoteAddress(quoteAddr);

  let stockAddr: string;
  let quote: QuoteLeg;
  let quoteAddress: string;
  let inverted = false;
  if (quoteQuote && officialByAddr.has(baseAddr)) {
    stockAddr = baseAddr;
    quote = quoteQuote;
    quoteAddress = pair.quoteToken?.address ?? QUOTE_META[quote].address;
  } else if (baseQuote && officialByAddr.has(quoteAddr)) {
    stockAddr = quoteAddr;
    quote = baseQuote;
    quoteAddress = pair.baseToken?.address ?? QUOTE_META[quote].address;
    inverted = true;
  } else {
    return null;
  }

  const stock = officialByAddr.get(stockAddr);
  if (!stock?.seeded) return null;

  const priceUsd = positive(pair.priceUsd);
  const native = positive(pair.priceNative);
  return {
    stock,
    quote,
    quoteAddress,
    priceUsd,
    priceNative: inverted && native != null && native > 0 ? 1 / native : native,
  };
}

function pickDeepest(rows: RhLpPoolRow[]): RhLpPoolRow[] {
  const best = new Map<string, RhLpPoolRow>();
  for (const row of rows) {
    const key = `${row.symbol}:${row.quote}`;
    const prev = best.get(key);
    const tvl = row.tvlUsd ?? 0;
    const prevTvl = prev?.tvlUsd ?? -1;
    if (!prev || tvl > prevTvl) best.set(key, row);
  }
  return [...best.values()].sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));
}

export async function getRhLpData(): Promise<RhLpPayload> {
  const warnings: string[] = [];
  const fetchedAt = new Date().toISOString();
  const sources = {
    endpoints: [
      {
        name: "Robinhood /rhj/assets",
        url: RH_ASSETS_URL,
        noteZh: "chainId=4663 官方 Stock Token 合约。匹配池子只认这些地址，不靠 ticker 字符串。",
      },
      {
        name: "Robinhood Chain contracts",
        url: RH_CONTRACTS_DOCS,
        noteZh: "文档锚点：WETH 0x0Bd7…AD73、USDG 0x5fc5…d168（6 decimals）。",
      },
      {
        name: "Robinhood /rhj/prices/{SYMBOL}",
        url: `${RH_PRICES_URL}/NVDA`,
        noteZh: "官方买卖价中间价，用来算链上 Dex 价相对溢价/折价。无历史序列。",
      },
      {
        name: "DexScreener token-pairs",
        url: `https://api.dexscreener.com/token-pairs/v1/${DEXSCREENER_CHAIN}/{token}`,
        noteZh: "Robinhood slug 是 robinhood 不是 4663。TVL、24h 成交量、Dex 链接。",
      },
      {
        name: "GeckoTerminal pools/multi + OHLCV",
        url: `https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK}/pools`,
        noteZh: "手续费档位（pool_fee_percentage / 池名 %）。回测日频 OHLCV+成交量。",
      },
      {
        name: "DexPaprika OHLCV（回测备用）",
        url: `https://api.dexpaprika.com/networks/robinhood/pools/{pool}/ohlcv`,
        noteZh: "GeckoTerminal 无历史时回退。start 必须是日期；volume 按 USD 使用。",
      },
    ],
  };

  try {
    const assets = await fetchRhAssets(warnings);
    const officialByAddr = new Map(assets.map((a) => [addrKey(a.address), a]));
    const officialBySym = new Map(assets.map((a) => [a.symbol, a]));
    const seededAssets = SEED_SYMBOLS.map((sym) => officialBySym.get(sym)).filter(
      (a): a is RhAsset => Boolean(a),
    );

    const missingOfficial = OPTIONAL_MISSING.filter((sym) => !officialBySym.has(sym)).map((symbol) => ({
      symbol,
      noteZh: `官方 /rhj/assets（chainId ${RH_CHAIN_ID}）暂无 ${symbol}，不编造地址或池子。`,
    }));
    for (const sym of SEED_SYMBOLS) {
      if (!officialBySym.has(sym)) {
        missingOfficial.push({
          symbol: sym,
          noteZh: `种子标的 ${sym} 未出现在官方资产列表中。`,
        });
      }
    }

    const pairLists = await mapLimit(seededAssets, 6, async (asset) => fetchDexPairs(asset.address, warnings));

    const classified: { pair: DexPair; meta: NonNullable<ReturnType<typeof classifyPair>> }[] = [];
    for (const list of pairLists) {
      for (const pair of list) {
        const meta = classifyPair(pair, officialByAddr);
        if (!meta || !pair.pairAddress) continue;
        classified.push({ pair, meta });
      }
    }

    const prices = new Map<string, RhOfficialPrice>();
    await mapLimit(seededAssets, 6, async (asset) => {
      const row = await fetchRhPrice(asset.symbol, warnings);
      if (row) prices.set(asset.symbol, row);
    });

    const allRows: RhLpPoolRow[] = classified.map(({ pair, meta }) => {
      const pairAddress = pair.pairAddress!;
      const tvlUsd = positive(pair.liquidity?.usd);
      const volume24hUsd = finite(pair.volume?.h24);
      const rhMid = officialPricesMid(prices.get(meta.stock.symbol));
      const priceUsd = meta.priceUsd;
      const premiumPct =
        priceUsd != null && rhMid != null && rhMid > 0 ? ((priceUsd - rhMid) / rhMid) * 100 : null;
      const txns = pair.txns?.h24;
      const txns24h =
        txns && (finite(txns.buys) != null || finite(txns.sells) != null)
          ? (txns.buys ?? 0) + (txns.sells ?? 0)
          : null;
      const created =
        typeof pair.pairCreatedAt === "number" && Number.isFinite(pair.pairCreatedAt)
          ? new Date(pair.pairCreatedAt).toISOString()
          : null;
      const quoteMeta = QUOTE_META[meta.quote];
      const volTvl = tvlUsd != null && volume24hUsd != null && tvlUsd > 0 ? volume24hUsd / tvlUsd : null;

      return {
        id: `${meta.stock.symbol}-${meta.quote}-${addrKey(pairAddress)}`,
        symbol: meta.stock.symbol,
        stockName: meta.stock.name,
        stockAddress: meta.stock.address,
        logoUrl: meta.stock.logoUrl,
        quote: meta.quote,
        quoteAddress: meta.quoteAddress,
        quoteLabel: quoteMeta.labelZh,
        pairLabel: `${meta.stock.symbol}/${quoteMeta.labelZh}`,
        pairAddress,
        dexId: pair.dexId ?? "",
        dexLabel: dexLabel(pair.dexId, pair.labels),
        feeTierPct: null,
        feeRate: null,
        tvlUsd,
        volume24hUsd,
        volTvl,
        grossFeeAprPct: null,
        priceUsd,
        priceNative: meta.priceNative,
        priceChange24hPct: finite(pair.priceChange?.h24),
        rhMidUsd: rhMid,
        premiumPct,
        txns24h,
        pairCreatedAt: created,
        dexscreenerUrl: pair.url ?? `${DEXSCREENER_BASE}/${addrKey(pairAddress)}`,
        explorerUrl: explorerUrl(pairAddress),
        geckoTerminalUrl: `${GECKO_POOL_BASE}/${addrKey(pairAddress)}`,
        uniswapUrl: `${UNISWAP_POOL_BASE}/${pairAddress}`,
        source: "DexScreener token-pairs + GeckoTerminal fee",
      };
    });

    const pools = pickDeepest(allRows);
    const fees = await fetchGtFees(
      pools.map((p) => p.pairAddress),
      warnings,
    );
    for (const pool of pools) {
      const fee = fees.get(addrKey(pool.pairAddress)) ?? parseFeeRate(null, null);
      pool.feeTierPct = fee.feeTierPct;
      pool.feeRate = fee.feeRate;
      pool.grossFeeAprPct = grossFeeAprPct(pool.volume24hUsd, fee.feeRate, pool.tvlUsd);
    }
    const tvlSum = pools.reduce((s, p) => s + (p.tvlUsd ?? 0), 0);
    const volSum = pools.reduce((s, p) => s + (p.volume24hUsd ?? 0), 0);
    const deepest = pools[0];

    return {
      ok: true,
      error: null,
      warnings,
      fetchedAt,
      timezone: "Asia/Shanghai",
      cacheSeconds: 600,
      chainId: RH_CHAIN_ID,
      missingOfficial,
      assets: seededAssets,
      pools,
      kpis: {
        poolCount: {
          key: "poolCount",
          labelZh: "监测池（最深一档）",
          labelEn: "Deepest Stock/USDG + Stock/ETH",
          valueUsd: null,
          valueText: String(pools.length),
          footnoteZh: `每个官方种子标的 × USDG / WETH 只保留 TVL 最深的一只池。共扫描 ${allRows.length} 个匹配池。`,
        },
        tvl: {
          key: "tvl",
          labelZh: "展示池 TVL 合计",
          labelEn: "Shown pools TVL",
          valueUsd: tvlSum || null,
          valueText: null,
          footnoteZh: "DexScreener liquidity.usd 之和，不是股权 AUM，也不是你可申领的 LP 仓位。",
        },
        volume24h: {
          key: "volume24h",
          labelZh: "展示池 24h 成交额",
          labelEn: "Shown pools 24h volume",
          valueUsd: volSum || null,
          valueText: null,
          footnoteZh: "DexScreener volume.h24。用于毛估手续费 APR，不是你的已实现费用。",
        },
        deepest: {
          key: "deepest",
          labelZh: "最深池",
          labelEn: "Deepest pool",
          valueUsd: deepest?.tvlUsd ?? null,
          valueText: deepest ? `${deepest.pairLabel} · ${deepest.dexLabel}` : "—",
          footnoteZh: deepest
            ? `${deepest.pairAddress.slice(0, 10)}… · ${deepest.dexLabel}${deepest.feeTierPct != null ? ` · ${deepest.feeTierPct}%` : ""}`
            : "暂无匹配池。",
        },
      },
      sources,
      dataNotesZh: [
        "手续费 APR = (volume24h × feeRate / TVL) × 365，是全池毛估，不是你的 LP APR（未扣集中流动性、未实现区间、未扣无常损失）。",
        "WETH 在界面标记为 ETH；报价资产仍是官方 WETH 合约。",
        "历史成交若不足，回测显示「历史不足」，不会用 24h 快照去编造多日曲线。",
        "HOOD 等未在官方资产列表出现的标的不会被编造。",
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: message,
      warnings,
      fetchedAt,
      timezone: "Asia/Shanghai",
      cacheSeconds: 600,
      chainId: RH_CHAIN_ID,
      missingOfficial: [],
      assets: [],
      pools: [],
      kpis: {
        poolCount: {
          key: "poolCount",
          labelZh: "监测池",
          labelEn: "Pools",
          valueUsd: null,
          valueText: "—",
          footnoteZh: "拉取失败。",
        },
        tvl: {
          key: "tvl",
          labelZh: "TVL",
          labelEn: "TVL",
          valueUsd: null,
          valueText: null,
          footnoteZh: "拉取失败。",
        },
        volume24h: {
          key: "volume24h",
          labelZh: "24h 成交额",
          labelEn: "24h volume",
          valueUsd: null,
          valueText: null,
          footnoteZh: "拉取失败。",
        },
        deepest: {
          key: "deepest",
          labelZh: "最深池",
          labelEn: "Deepest",
          valueUsd: null,
          valueText: "—",
          footnoteZh: "拉取失败。",
        },
      },
      sources,
      dataNotesZh: [],
    };
  }
}
