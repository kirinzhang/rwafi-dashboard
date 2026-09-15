import { RhLpShell } from "@/components/rh-lp/rh-lp-shell";
import { getRhLpData } from "@/lib/rh-lp-data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RH LP · Equity Token Radar",
  description: "Robinhood Chain 官方 Stock Token / USDG 与 Stock / ETH 池监控，以及费用 vs 无常损失回测。",
};

export default async function RhLpPage() {
  const data = await getRhLpData();
  return <RhLpShell initialData={data} />;
}
