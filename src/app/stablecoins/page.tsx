import { StablesShell } from "@/components/dashboard/stables-shell";
import { getStablesData } from "@/lib/stables-data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "稳定币 · Equity Token Radar",
  description: "全球美元稳定币流通、按币种与按链拆分，含 Robinhood Chain。",
};

export default async function StablecoinsPage() {
  const data = await getStablesData();
  return <StablesShell initialData={data} />;
}
