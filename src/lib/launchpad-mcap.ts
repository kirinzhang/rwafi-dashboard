import { llamaJson, settled } from "./llama";

export type EquityMcap = {
  symbol: string;
  geckoCoinId: string;
  circulatingUsd: number | null;
  fdvUsd: number | null;
  source: "coingecko" | "geckoterminal" | "stonkfun" | null;
  sourceUrl: string;
};

type GeckoSimple = Record<string, { usd?: number; usd_market_cap?: number; usd_fdv?: number }>;

type GtToken = {
  data?: {
    attributes?: {
      symbol?: string;
      market_cap_usd?: string | number | null;
      fdv_usd?: string | number | null;
      coingecko_coin_id?: string | null;
    };
  };
};

function finite(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function geckoSimple(ids: string[], warnings: string[]): Promise<GeckoSimple | null> {
  const url =
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(","))}` +
    "&vs_currencies=usd&include_market_cap=true&include_fdv=true";
  for (let attempt = 0; attempt < 3; attempt++) {
    const json = await settled(
      attempt === 0 ? "coingecko simple/price" : `coingecko simple/price retry ${attempt}`,
      llamaJson<GeckoSimple>(url, 20_000),
      attempt === 2 ? warnings : [],
    );
    if (json && Object.keys(json).length) return json;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return null;
}

export async function fetchEquityMcaps(
  tokens: { symbol: string; geckoCoinId: string; network: string; address: string }[],
  warnings: string[],
): Promise<Map<string, EquityMcap>> {
  const out = new Map<string, EquityMcap>();
  if (!tokens.length) return out;

  const gecko = await geckoSimple(
    [...new Set(tokens.map((t) => t.geckoCoinId))],
    warnings,
  );

  await Promise.all(
    tokens.map(async (token) => {
      const geckoRow = gecko?.[token.geckoCoinId];
      const circulating = finite(geckoRow?.usd_market_cap);
      const fdv = finite(geckoRow?.usd_fdv);
      if (circulating != null) {
        out.set(token.geckoCoinId, {
          symbol: token.symbol,
          geckoCoinId: token.geckoCoinId,
          circulatingUsd: circulating,
          fdvUsd: fdv,
          source: "coingecko",
          sourceUrl: `https://api.coingecko.com/api/v3/simple/price?ids=${token.geckoCoinId}&vs_currencies=usd&include_market_cap=true`,
        });
        return;
      }

      const gtUrl = `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(token.network)}/tokens/${encodeURIComponent(token.address)}`;
      const gt = await settled(
        `geckoterminal token ${token.symbol}`,
        llamaJson<GtToken>(gtUrl, 20_000),
        warnings,
      );
      const attrs = gt?.data?.attributes;
      const gtMcap = finite(attrs?.market_cap_usd);
      const gtFdv = finite(attrs?.fdv_usd);
      if (gtMcap != null || gtFdv != null) {
        out.set(token.geckoCoinId, {
          symbol: token.symbol,
          geckoCoinId: token.geckoCoinId,
          circulatingUsd: gtMcap,
          fdvUsd: gtFdv,
          source: "geckoterminal",
          sourceUrl: gtUrl,
        });
        return;
      }

      out.set(token.geckoCoinId, {
        symbol: token.symbol,
        geckoCoinId: token.geckoCoinId,
        circulatingUsd: null,
        fdvUsd: null,
        source: null,
        sourceUrl: `https://www.coingecko.com/en/coins/${token.geckoCoinId}`,
      });
    }),
  );

  return out;
}
