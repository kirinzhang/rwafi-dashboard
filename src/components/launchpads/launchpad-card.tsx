import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatUsd } from "@/lib/format";
import type { LaunchpadCard } from "@/lib/launchpad-types";
import { PeriodStats } from "./period-stats";

export function LaunchpadCardView({ pad }: { pad: LaunchpadCard }) {
  return (
    <Card className="border-white/5 bg-card/80">
      <CardHeader className="border-b border-white/5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: pad.color }} />
              {pad.displayName}
              {pad.primary ? (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  主平台
                </Badge>
              ) : (
                <Badge variant="outline" className="h-4 px-1 text-[10px]">
                  对照
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1 max-w-3xl leading-relaxed">{pad.noteZh}</CardDescription>
          </div>
          <div className="flex gap-2 text-xs">
            <a href={pad.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">
              官网
            </a>
            <a
              href={pad.defillamaUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:underline"
            >
              DefiLlama
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <PeriodStats label="成交量（DEX / 曲线）" period={pad.volume} hint={pad.volumeNoteZh} />
          <PeriodStats
            label="毛手续费 Gross fees"
            period={pad.grossFees}
            hint={pad.feeMethodologyZh}
          />
          <div className="space-y-3">
            <PeriodStats label="协议收入 Protocol revenue" period={pad.protocolRevenue} />
            <PeriodStats
              label="创作者分成（近似）"
              period={pad.creatorShareApprox}
              hint="毛手续费 − 协议收入。若 DefiLlama 未拆分则为 0 或 —。"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-medium">Top 5 代币（市值 / FDV）</div>
          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">{pad.topTokensNoteZh}</p>
          {pad.topTokens.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 py-6 text-center text-sm text-muted-foreground">
              —
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>代币</TableHead>
                  <TableHead className="text-right">市值</TableHead>
                  <TableHead className="text-right">FDV</TableHead>
                  <TableHead className="text-right">24h 量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pad.topTokens.map((token, i) => (
                  <TableRow key={`${token.network}-${token.poolAddress}-${token.symbol}`}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <a href={token.url} target="_blank" rel="noreferrer" className="hover:underline">
                        <span className="font-medium">{token.symbol}</span>{" "}
                        <span className="text-muted-foreground">{token.name}</span>
                      </a>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(token.mcapUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(token.fdvUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(token.volume24h)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
