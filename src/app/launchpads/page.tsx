import { LaunchpadsShell } from "@/components/launchpads/launchpads-shell";
import { getLaunchpadsData } from "@/lib/launchpads";

export const dynamic = "force-dynamic";

export default async function LaunchpadsPage() {
  const data = await getLaunchpadsData();
  return <LaunchpadsShell initialData={data} />;
}
