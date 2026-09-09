import { CACHE_SECONDS } from "@/lib/llama";
import { getStablesData } from "@/lib/stables-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getStablesData();
  return Response.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=120`,
    },
  });
}
