import { CACHE_SECONDS } from "@/lib/llama";
import { getRhLpData } from "@/lib/rh-lp-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getRhLpData();
  return Response.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=120`,
    },
  });
}
