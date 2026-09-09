import { LaunchpadsShell } from "@/components/launchpads/launchpads-shell";
import { getLaunchpadsData } from "@/lib/launchpads";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "发射台 · Equity Token Radar",
  description: "Pons、Long.xyz、stonk.fun、pump.fun、four.meme、Flap.sh 日频费用、成交量、PE 与收入拆分。",
};

export default async function LaunchpadsPage() {
  const data = await getLaunchpadsData();
  return <LaunchpadsShell initialData={data} />;
}
