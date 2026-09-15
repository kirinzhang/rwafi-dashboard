import { CACHE_SECONDS } from "@/lib/llama";
import { getRhLpBacktest } from "@/lib/rh-lp-backtest";
import type { RhLpWindowKey } from "@/lib/rh-lp-types";

export const dynamic = "force-dynamic";

const WINDOWS = new Set<RhLpWindowKey>(["d7", "d30", "d90"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pair = url.searchParams.get("pair") ?? "";
  const windowParam = (url.searchParams.get("window") ?? "d30") as RhLpWindowKey;
  const windowKey = WINDOWS.has(windowParam) ? windowParam : "d30";
  const data = await getRhLpBacktest(pair, windowKey);
  const status = data.error && !data.ok ? 400 : 200;
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=120`,
    },
  });
}
