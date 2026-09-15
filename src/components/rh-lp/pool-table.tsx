"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatApr, formatPct, formatRatio, formatUsd } from "@/lib/format";
import type { QuoteLeg, RhLpPoolRow } from "@/lib/rh-lp-types";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

function tone(value: number | null | undefined): string {
  if (value == null) return "text-muted-foreground";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-rose-400";
  return "text-muted-foreground";
}

function premiumLabel(value: number | null): string {
  if (value == null) return "—";
  if (value > 0) return `溢价 ${formatPct(value)}`;
  if (value < 0) return `折价 ${formatPct(value)}`;
  return "平价";
}

export function PoolTable({
  pools,
  quote,
  selectedId,
  onSelect,
}: {
  pools: RhLpPoolRow[];
  quote: QuoteLeg;
  selectedId: string | null;
  onSelect: (row: RhLpPoolRow) => void;
}) {
  const rows = pools.filter((p) => p.quote === quote);

  return (
    <Card className="border-white/5 bg-card/80">
      <CardHeader>
        <CardTitle>
          {quote === "USDG" ? "Stock / USDG" : "Stock / ETH"}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            每个官方种子标的只显示 TVL 最深的一只池 · {rows.length} 个
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            当前报价腿没有匹配到官方 Stock Token 池。可能是 DexScreener 尚未收录，或该标的还没有
            {quote === "WETH" ? " WETH" : " USDG"} 池。
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>交易对</TableHead>
                <TableHead>DEX</TableHead>
                <TableHead className="text-right">费率</TableHead>
                <TableHead className="text-right">TVL</TableHead>
                <TableHead className="text-right">24h 量</TableHead>
                <TableHead className="text-right">Vol/TVL</TableHead>
                <TableHead className="text-right">毛估 APR</TableHead>
                <TableHead className="text-right">链上价</TableHead>
                <TableHead className="text-right">溢价</TableHead>
                <TableHead>链接</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const active = selectedId === row.id;
                return (
                  <TableRow
                    key={row.id}
                    data-state={active ? "selected" : undefined}
                    className={cn("cursor-pointer", active && "bg-emerald-400/8")}
                    onClick={() => onSelect(row)}
                  >
                    <TableCell>
                      <div className="flex min-w-36 items-center gap-2">
                        {row.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.logoUrl}
                            alt=""
                            width={28}
                            height={28}
                            className="size-7 shrink-0 rounded-md bg-white/5 object-contain"
                          />
                        ) : (
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px]">
                            {row.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{row.pairLabel}</div>
                          <div className="text-[11px] text-muted-foreground">{row.symbol}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        {row.dexLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.feeTierPct == null ? "—" : `${row.feeTierPct}%`}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatUsd(row.tvlUsd)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(row.volume24hUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRatio(row.volTvl)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="font-medium">{formatApr(row.grossFeeAprPct)}</div>
                      <div className="text-[10px] text-muted-foreground">全池毛估</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div>{row.priceUsd == null ? "—" : `$${row.priceUsd.toFixed(2)}`}</div>
                      <div className={cn("text-[11px]", tone(row.priceChange24hPct))}>
                        {formatPct(row.priceChange24hPct)}
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-right text-[12px] tabular-nums", tone(row.premiumPct))}>
                      {premiumLabel(row.premiumPct)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <a
                          href={row.dexscreenerUrl}
                          className="inline-flex items-center gap-0.5 text-sky-300 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          DexScreener <ExternalLink className="size-3" />
                        </a>
                        <a
                          href={row.explorerUrl}
                          className="inline-flex items-center gap-0.5 text-sky-300 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Explorer
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          毛估 APR 不是你的 LP APR。点击一行加载该池的满档费用 / IL 回测。
        </p>
      </CardContent>
    </Card>
  );
}
