import { getLaunchpadsData } from "@/lib/launchpads";
import { CACHE_SECONDS } from "@/lib/llama";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getLaunchpadsData();
  return Response.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=120`,
    },
  });
}
