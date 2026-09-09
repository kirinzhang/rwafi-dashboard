"use client";

import { formatUsd } from "@/lib/format";
import type { RangeKey, WindowMetric } from "@/lib/launchpad-types";
import { pickMissing, pickRange } from "@/lib/launchpad-windows";
import type { LucideIcon } from "lucide-react";
import { MetricSparkline } from "./metric-sparkline";

export function MetricTile({
  icon: Icon,
  label,
  metric,
  range,
  days,
  color,
  hint,
  gradientId,
}: {
  icon: LucideIcon;
  label: string;
  metric: WindowMetric;
  range: RangeKey;
  days: number;
  color: string;
  hint?: string | null;
  gradientId: string;
}) {
  const value = pickRange(metric, range);
  const missing = pickMissing(metric, range);
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
          <div className="text-[11px] leading-tight text-muted-foreground">{label}</div>
          <div className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">
            {formatUsd(value)}
          </div>
        </div>
      </div>
      <div className="mt-2">
        {metric.series.length >= 2 ? (
          <MetricSparkline series={metric.series} days={days} color={color} gradientId={gradientId} />
        ) : (
          <div className="flex h-14 items-center text-[11px] text-muted-foreground/70">
            {missing ? "无可用日频图" : "无窗口内日频点"}
          </div>
        )}
      </div>
      {missing ? (
        <p className="mt-1 text-[11px] leading-relaxed text-amber-200/80">— {missing}</p>
      ) : hint ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
