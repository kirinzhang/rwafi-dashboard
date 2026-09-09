"use client";

import { formatUsd } from "@/lib/format";
import type { LaunchpadAllocation, RangeKey } from "@/lib/launchpad-types";
import { RANGE_OPTIONS } from "@/lib/launchpad-types";
import { barsForFullSeries, barsForWindow } from "@/lib/launchpad-windows";
import { Flame } from "lucide-react";
import { DuneBarChart } from "./dune-bar-chart";

export function AllocationBlock({
  allocation,
  range,
  color,
}: {
  allocation: LaunchpadAllocation;
  range: RangeKey;
  color: string;
}) {
  const days = RANGE_OPTIONS.find((item) => item.key === range)?.days ?? 30;
  const isAll = range === "all";
  const full = isAll ? barsForFullSeries(allocation.series) : null;
  const bars = isAll
    ? (full?.points ?? [])
    : allocation.series.length
      ? barsForWindow(allocation.series, days)
      : [];
  const windowSum = bars.length ? bars.reduce((sum, p) => sum + p.v, 0) : null;

  return (
    <div className="space-y-3 rounded-xl border border-white/8 p-3">
      <div className="flex items-start gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-orange-400/10 text-orange-300">
          <Flame className="size-4" />
        </div>
        <div>
          <div className="text-sm font-medium">收入如何拆分 · 回购 / 销毁 / 分红</div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{allocation.policyZh}</p>
        </div>
      </div>
      {allocation.citations.length ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          {allocation.citations.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">
                {item.name}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {allocation.extraTotals.length ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {allocation.extraTotals.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/6 bg-white/2 px-3 py-2">
              <div className="text-[11px] text-muted-foreground">{item.label}</div>
              <div className="text-base font-semibold tabular-nums">{formatUsd(item.value)}</div>
              {item.note ? <div className="text-[10px] text-muted-foreground">{item.note}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      <DuneBarChart
        title={allocation.chartTitleZh}
        total={windowSum}
        missing={allocation.missingChartZh ?? undefined}
        days={isAll ? Math.max(bars.length, 1) : days}
        grainNote={
          [
            allocation.cumulativeLabelZh,
            isAll ? full?.note : null,
            allocation.chartNoteZh,
          ]
            .filter(Boolean)
            .join(" · ") || null
        }
        series={
          bars.length
            ? [{ key: "executed", label: allocation.chartTitleZh, color, points: bars }]
            : []
        }
      />
    </div>
  );
}
