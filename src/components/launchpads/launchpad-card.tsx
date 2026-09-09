"use client";

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
import type { LaunchpadCard, RangeKey } from "@/lib/launchpad-types";
import { RANGE_OPTIONS } from "@/lib/launchpad-types";
import { barsForWindow, pickMissing, pickRange } from "@/lib/launchpad-windows";
import { BarChart3, Landmark, Receipt, Trophy, Users } from "lucide-react";
import { DuneBarChart } from "./dune-bar-chart";
import { MetricKpi } from "./metric-kpi";

export function LaunchpadCardView({ pad, range }: { pad: LaunchpadCard; range: RangeKey }) {
  const days = RANGE_OPTIONS.find((item) => item.key === range)?.days ?? 30;
  const volumeBars = pad.volume.series.length ? barsForWindow(pad.volume.series, days) : [];
  const feeEnd = Math.max(pad.grossFees.series.at(-1)?.t ?? 0, pad.protocolRevenue.series.at(-1)?.t ?? 0) || undefined;
  const feeBars =
    pad.grossFees.series.length && feeEnd ? barsForWindow(pad.grossFees.series, days, feeEnd) : [];
  const revenueBars =
    pad.protocolRevenue.series.length && feeEnd
      ? barsForWindow(pad.protocolRevenue.series, days, feeEnd)
      : [];

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
            {pad.defillamaUrl ? (
              <a
                href={pad.defillamaUrl}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:underline"
              >
                DefiLlama
              </a>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricKpi
            icon={BarChart3}
            label="成交量"
            metric={pad.volume}
            range={range}
            color={pad.color}
            hint={pad.volumeNoteZh}
          />
          <MetricKpi
            icon={Receipt}
            label="毛手续费"
            metric={pad.grossFees}
            range={range}
            color="#fb7185"
            hint={pad.feeMethodologyZh}
          />
          <MetricKpi
            icon={Landmark}
            label="协议收入"
            metric={pad.protocolRevenue}
            range={range}
            color="#34d399"
            hint="DefiLlama dailyRevenue（协议留存）。"
          />
          <MetricKpi
            icon={Users}
            label="创作者分成（近似）"
            metric={pad.creatorShareApprox}
            range={range}
            color="#fbbf24"
            hint="毛手续费 − 协议收入。未拆分时为 0 或 —。"
          />
        </div>

        <DuneBarChart
          title="日成交量"
          total={pickRange(pad.volume, range)}
          missing={pickMissing(pad.volume, range)}
          days={days}
          series={
            volumeBars.length
              ? [{ key: "volume", label: "成交量", color: pad.color, points: volumeBars }]
              : []
          }
        />
        <DuneBarChart
          title="日毛手续费 / 协议收入"
          total={pickRange(pad.grossFees, range)}
          missing={pickMissing(pad.grossFees, range)}
          days={days}
          series={
            feeBars.length
              ? [
                  { key: "fees", label: "毛手续费", color: "#fb7185", points: feeBars },
                  ...(pad.protocolRevenue.series.length
                    ? [
                        {
                          key: "revenue",
                          label: "协议收入",
                          color: "#34d399",
                          points: revenueBars,
                        },
                      ]
                    : []),
                ]
              : []
          }
        />

        <div className="rounded-xl border border-white/8 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-amber-400/10 text-amber-300">
              <Trophy className="size-4" />
            </div>
            <div>
              <div className="text-sm font-medium">Top 5 代币（市值 / FDV）</div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{pad.topTokensNoteZh}</p>
            </div>
          </div>
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
