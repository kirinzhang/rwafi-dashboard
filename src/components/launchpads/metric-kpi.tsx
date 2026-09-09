"use client";

import { formatUsd } from "@/lib/format";
import type { RangeKey, WindowMetric } from "@/lib/launchpad-types";
import { pickMissing, pickRange } from "@/lib/launchpad-windows";
import type { LucideIcon } from "lucide-react";

export function MetricKpi({
  icon: Icon,
  label,
  metric,
  range,
  color,
  hint,
  snapshotUsd = null,
  snapshotLabel = "近 24h 快照",
}: {
  icon: LucideIcon;
  label: string;
  metric: WindowMetric;
  range: RangeKey;
  color: string;
  hint?: string | null;
  snapshotUsd?: number | null;
  snapshotLabel?: string;
}) {
  const value = pickRange(metric, range);
  const missing = pickMissing(metric, range);
  const hero = value ?? snapshotUsd;
  const showingSnapshot = value == null && snapshotUsd != null;
  return (
    <div className="rounded-xl border border-white/8 bg-white/2 p-3">
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10"
          style={{ background: `${color}22`, color }}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] leading-tight text-muted-foreground">
            {label}
            {showingSnapshot ? <span className="ml-1 text-sky-300/90">{snapshotLabel}</span> : null}
          </div>
          <div className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">
            {formatUsd(hero)}
          </div>
        </div>
      </div>
      {snapshotUsd != null && value != null ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {snapshotLabel} {formatUsd(snapshotUsd)}
        </p>
      ) : null}
      {missing ? (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-200/80">— {missing}</p>
      ) : hint ? (
        <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
