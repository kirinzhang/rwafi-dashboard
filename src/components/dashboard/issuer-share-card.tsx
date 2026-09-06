import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import type { IssuerRow } from "@/lib/types";
import { IssuerLogo } from "./issuer-logo";
import { ShareBars } from "./share-bars";

export function IssuerShareCard({
  issuers,
  totalUsd,
  hhi,
  concentrationZh,
  concentrationEn,
}: {
  issuers: IssuerRow[];
  totalUsd: number;
  hhi: number;
  concentrationZh: string;
  concentrationEn: string;
}) {
  const rows = issuers.filter((i) => i.tvlUsd != null && i.tvlUsd > 0);
  return (
    <Card className="border-white/5 bg-card/80">
      <CardHeader className="border-b border-white/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>发行方市占（实时协议 TVL）</CardTitle>
            <CardDescription>
              Tokenized value grouped by issuer · DefiLlama protocol TVL · 合计 {formatUsd(totalUsd)}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">HHI {Math.round(hhi).toLocaleString("en-US")}</div>
            <Badge variant="secondary" className="mt-1">
              {concentrationZh} / {concentrationEn}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">暂无可用的协议 TVL。</p>
        ) : (
          <ShareBars
            rows={rows.map((row) => ({
              name: row.displayName,
              usd: row.tvlUsd ?? 0,
              sharePct: row.sharePct ?? 0,
              color: row.color,
              logo: <IssuerLogo src={row.logoUrl} name={row.shortName} color={row.color} />,
            }))}
          />
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          HHI 仅基于本看板能拉到的免费协议 TVL。推文截图里的 Binance / Reality / Robinhood / Backpack
          没有对应免费实时源，因此不会被编造进这张图；实时 HHI 往往会高于那张更完整的 rwa.xyz 图。
        </p>
      </CardContent>
    </Card>
  );
}
