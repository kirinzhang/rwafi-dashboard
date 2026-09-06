import { getDashboardData } from "@/lib/dashboard";
import { CACHE_SECONDS } from "@/lib/llama";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getDashboardData();
  return Response.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=120`,
    },
  });
}
