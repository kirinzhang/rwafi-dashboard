import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import type { TweetSnapshot } from "@/lib/types";
import { ShareBars } from "./share-bars";

export function TweetSnapshotCard({ snapshot }: { snapshot: TweetSnapshot }) {
  return (
    <Card className="border-amber-400/15 bg-card/80">
      <CardHeader className="border-b border-white/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>推文快照（静态对照）</CardTitle>
            <CardDescription>
              {snapshot.title} · {snapshot.asOf} · 合计约 {formatUsd(snapshot.totalUsd)}
            </CardDescription>
          </div>
          <div className="text-right">
            <Badge variant="outline">非实时 / {snapshot.asOf}</Badge>
            <div className="mt-1 text-xs text-muted-foreground">
              HHI {snapshot.hhi.toLocaleString("en-US")} · {snapshot.concentrationZh}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ShareBars
          rows={snapshot.rows.map((row) => ({
            name: row.name,
            usd: row.usd,
            sharePct: row.sharePct,
            color: row.color,
          }))}
        />
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{snapshot.sourceNoteZh}</p>
      </CardContent>
    </Card>
  );
}
