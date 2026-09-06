"use client";

import { Badge } from "@/components/ui/badge";
import { formatShanghai } from "@/lib/format";
import { Activity, RefreshCw } from "lucide-react";

export function SiteHeader({
  fetchedAt,
  refreshing,
  onRefresh,
}: {
  fetchedAt: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Activity className="size-5 text-emerald-400" />
          <Badge variant="secondary">Equity Token Radar</Badge>
          <Badge variant="outline">免费数据 · 无 API Key</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">代币化美股 &amp; 稳定币看板</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          追踪代币化美股协议 TVL 与稳定币发行。Robinhood Chain 夏天看股权代币 AUM，而不是发射台市值。
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div>
          <div>最近更新（上海）</div>
          <div className="font-medium text-foreground tabular-nums">{formatShanghai(fetchedAt)}</div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-foreground hover:bg-white/5"
        >
          <RefreshCw className={refreshing ? "size-3.5 animate-spin" : "size-3.5"} />
          刷新
        </button>
      </div>
    </header>
  );
}
