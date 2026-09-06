import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";
import type { KpiBlock } from "@/lib/types";
import { ChangePills } from "./change-pills";

export function HeroKpis({ items }: { items: KpiBlock[] }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <Card key={item.key} className="border-white/5 bg-card/80 backdrop-blur">
          <CardHeader className="gap-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-[13px] leading-snug text-muted-foreground">
                {item.labelZh}
              </CardTitle>
              <Badge variant={item.live ? "secondary" : "outline"} className="shrink-0">
                {item.live ? "实时" : item.proxy ? "代理" : "无实时源"}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground/80">{item.labelEn}</div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.7rem]">
              {formatUsd(item.valueUsd)}
            </div>
            <ChangePills change={item.change} />
            <p className="text-[11px] leading-relaxed text-muted-foreground">{item.footnoteZh}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
