"use client";

import { formatUsd } from "@/lib/format";
import type { PeriodUsd } from "@/lib/launchpad-types";

export function PeriodStats({
  label,
  period,
  hint,
}: {
  label: string;
  period: PeriodUsd;
  hint?: string | null;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/2 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{formatUsd(period.h24)}</div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-xs tabular-nums text-muted-foreground">
        <span>
          24h <span className="text-foreground">{formatUsd(period.h24)}</span>
        </span>
        <span>
          7d <span className="text-foreground">{formatUsd(period.d7)}</span>
        </span>
        <span>
          30d <span className="text-foreground">{formatUsd(period.d30)}</span>
        </span>
      </div>
      {hint ? <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
