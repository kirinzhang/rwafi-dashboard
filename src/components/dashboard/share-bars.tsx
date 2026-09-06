import { formatShare, formatUsd } from "@/lib/format";
import type { ReactNode } from "react";

export type ShareBarRow = {
  name: string;
  usd: number;
  sharePct: number;
  color: string;
  logo?: ReactNode;
};

export function ShareBars({ rows }: { rows: ShareBarRow[] }) {
  const max = Math.max(...rows.map((r) => r.sharePct), 1);
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              {row.logo}
              <span className="truncate text-sm font-medium text-foreground">{row.name}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max((row.sharePct / max) * 100, 1.5)}%`,
                  background: row.color,
                }}
              />
            </div>
          </div>
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold tabular-nums text-foreground">
              {formatUsd(row.usd)}
            </div>
            <div className="text-xs tabular-nums text-muted-foreground">{formatShare(row.sharePct)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
