import { formatPct } from "@/lib/format";
import type { ChangeSet } from "@/lib/types";
import { cn } from "@/lib/utils";

function tone(value: number | null): string {
  if (value == null) return "text-muted-foreground";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-rose-400";
  return "text-muted-foreground";
}

export function ChangePills({
  change,
  compact = false,
}: {
  change: ChangeSet;
  compact?: boolean;
}) {
  const items = [
    { key: "24h", value: change.d1 },
    { key: "7d", value: change.d7 },
    { key: "30d", value: change.d30 },
  ];
  return (
    <div className={cn("flex flex-wrap gap-x-2 gap-y-1", compact ? "text-[11px]" : "text-xs")}>
      {items.map((item) => (
        <span key={item.key} className="tabular-nums">
          <span className="text-muted-foreground">{item.key} </span>
          <span className={tone(item.value)}>{formatPct(item.value)}</span>
        </span>
      ))}
    </div>
  );
}

export function ChangeText({ value }: { value: number | null }) {
  return <span className={cn("tabular-nums", tone(value))}>{formatPct(value)}</span>;
}
