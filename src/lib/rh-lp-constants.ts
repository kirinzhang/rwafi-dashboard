import seed from "../../data/rh-lp.json";
import type { QuoteLeg } from "./rh-lp-types";

export const RH_CHAIN_ID = 4663 as const;
export const DEXSCREENER_CHAIN = seed.dexscreenerChain;
export const GECKO_NETWORK = seed.geckoNetwork;
export const DEXPAPRIKA_NETWORK = seed.dexpaprikaNetwork;

export const QUOTE_ADDRESSES: Record<QuoteLeg, string> = {
  USDG: seed.quotes.USDG.address,
  WETH: seed.quotes.WETH.address,
};

export const QUOTE_META: Record<
  QuoteLeg,
  { symbol: QuoteLeg; labelZh: string; labelEn: string; address: string; decimals: number }
> = {
  USDG: seed.quotes.USDG as {
    symbol: "USDG";
    labelZh: string;
    labelEn: string;
    address: string;
    decimals: number;
  },
  WETH: seed.quotes.WETH as {
    symbol: "WETH";
    labelZh: string;
    labelEn: string;
    address: string;
    decimals: number;
  },
};

export const SEED_SYMBOLS: string[] = seed.seedSymbols;
export const OPTIONAL_MISSING: string[] = seed.optionalMissing;

export const INITIAL_STOCK_USD = 1;
export const INITIAL_QUOTE_USD = 1;
export const INITIAL_LP_USD = INITIAL_STOCK_USD + INITIAL_QUOTE_USD;

export const WINDOW_DAYS: Record<"d7" | "d30" | "d90", number> = {
  d7: 7,
  d30: 30,
  d90: 90,
};

export const BLOCKSCOUT_BASE = "https://robinhoodchain.blockscout.com";
export const DEXSCREENER_BASE = "https://dexscreener.com/robinhood";
export const GECKO_POOL_BASE = "https://www.geckoterminal.com/robinhood/pools";
export const UNISWAP_POOL_BASE = "https://app.uniswap.org/explore/pools/robinhood";
export const RH_ASSETS_URL = "https://api.robinhood.com/rhj/assets";
export const RH_PRICES_URL = "https://api.robinhood.com/rhj/prices";
export const RH_CONTRACTS_DOCS = "https://docs.robinhood.com/chain/contracts";
export const WETH_USDG_POOL = "0x52e65B17fB6E5BA00Ed806f37Afcd2DaA50271Ca";

export function addrKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isQuoteAddress(address: string | null | undefined): QuoteLeg | null {
  const key = addrKey(address);
  if (!key) return null;
  if (key === addrKey(QUOTE_ADDRESSES.USDG)) return "USDG";
  if (key === addrKey(QUOTE_ADDRESSES.WETH)) return "WETH";
  return null;
}

export function explorerUrl(pairAddress: string): string {
  const addr = pairAddress.startsWith("0x") ? pairAddress : `0x${pairAddress}`;
  if (addr.length === 42) return `${BLOCKSCOUT_BASE}/address/${addr}`;
  return `${BLOCKSCOUT_BASE}/pools/${addr}`;
}
