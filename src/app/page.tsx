import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDashboardData } from "@/lib/dashboard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "美股代币 · Equity Token Radar",
  description: "代币化美股协议 TVL、发行方与按标的股票堆叠发行量。",
};

export default async function HomePage() {
  const data = await getDashboardData();
  return <DashboardShell initialData={data} />;
}
