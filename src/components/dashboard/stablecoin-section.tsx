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
import { formatPct, formatShare, formatUsd } from "@/lib/format";
import type { StablesPayload } from "@/lib/types";
import { ChangePills, ChangeText } from "./change-pills";
import { TrendChart } from "./trend-chart";

const CHAIN_COLORS = [
  "#2e90fa",
  "#12b76a",
  "#f79009",
  "#ee46bc",
  "#7a5af8",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#eab308",
];

export function StablecoinSection({
  data,
  kpis,
}: {
  data: StablesPayload["stables"];
  kpis: StablesPayload["kpis"];
}) {
  const global = kpis.globalStables;
  const rh = kpis.rhStables;
  const maxChain = Math.max(...data.byChain.map((c) => c.circulatingUsd), 1);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Card className="border-white/5 bg-card/80 lg:col-span-7">
          <CardHeader className="pb-2">
            <CardDescription>Total Stablecoin Market Cap · peggedUSD</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
              {formatUsd(global.valueUsd ?? data.totalUsd)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border border-white/10 px-2 py-1">
                1d {formatPct(global.change.d1)}
              </span>
              <span className="rounded-md border border-white/10 px-2 py-1">
                7d {formatPct(global.change.d7)}
              </span>
              <span className="rounded-md border border-white/10 px-2 py-1">
                30d {formatPct(global.change.d30)}
              </span>
              <span className="rounded-md border border-white/10 px-2 py-1">
                {data.assetCount} 种美元稳定币
              </span>
            </div>
            <ChangePills change={global.change} />
            <p className="text-[11px] text-muted-foreground">{global.footnoteZh}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          <Card className="border-white/5 bg-card/80">
            <CardHeader className="pb-2">
              <CardDescription>USDT Dominance</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {data.usdtDominancePct != null ? formatShare(data.usdtDominancePct) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm tabular-nums text-muted-foreground">Tether {formatUsd(data.usdtUsd)}</p>
            </CardContent>
          </Card>
          <Card className="border-orange-400/20 bg-card/80">
            <CardHeader className="pb-2">
              <CardDescription>Robinhood Chain · 不是股权 AUM</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{formatUsd(rh.valueUsd)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ChangePills change={rh.change} compact />
              <p className="text-[11px] text-muted-foreground">{rh.footnoteZh}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-white/5 bg-card/80">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>稳定币市值</CardTitle>
            <CardDescription>stablecoincharts/all · totalCirculatingUSD.peggedUSD · 面积图口径同 DefiLlama</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <TrendChart series={data.globalHistory} color="#2e90fa" emptyText="全球稳定币历史暂不可用" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Card className="border-white/5 bg-card/80 xl:col-span-7">
          <CardHeader>
            <CardTitle>稳定币</CardTitle>
            <CardDescription>按流通市值排序 · DefiLlama peggedUSD · 价格来自 includePrices</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {data.top.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无稳定币数据。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead className="text-right">价格</TableHead>
                    <TableHead>1d / 7d / 30d</TableHead>
                    <TableHead className="min-w-32">占比</TableHead>
                    <TableHead className="text-right">市值</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {row.name}{" "}
                          <span className="font-normal text-muted-foreground">{row.symbol}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {row.pegMechanism ?? "—"}
                          {row.chains.length ? ` · ${row.chains.length} 链` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.price != null ? `$${row.price.toFixed(row.price >= 1.005 || row.price <= 0.995 ? 3 : 4)}` : "—"}
                      </TableCell>
                      <TableCell>
                        <ChangePills change={row.change} compact />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-white/8">
                            <div
                              className="h-full rounded-full bg-sky-400"
                              style={{ width: `${Math.max(Math.min(row.sharePct, 100), 0.8)}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                            {formatShare(row.sharePct)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatUsd(row.circulatingUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3 xl:col-span-5">
          <Card className="border-white/5 bg-card/80">
            <CardHeader>
              <CardTitle>按链</CardTitle>
              <CardDescription>stablecoinchains · 高亮 Ethereum / Solana / Tron / Base / Arbitrum / Robinhood Chain</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.byChain.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">暂无分链数据。</p>
              ) : (
                data.byChain.map((row, index) => (
                  <div
                    key={row.name}
                    className={
                      row.name === "Robinhood Chain"
                        ? "rounded-lg border border-orange-400/20 bg-orange-400/5 p-2"
                        : ""
                    }
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{row.name}</span>
                        {row.highlighted ? (
                          <Badge variant={row.name === "Robinhood Chain" ? "default" : "secondary"}>
                            {row.name === "Robinhood Chain" ? "RH" : "重点"}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <div className="tabular-nums font-medium">{formatUsd(row.circulatingUsd)}</div>
                        <div className="text-[11px] tabular-nums text-muted-foreground">
                          {formatShare(row.sharePct)}
                          {row.name === "Robinhood Chain" ? (
                            <>
                              {" "}
                              <ChangeText value={row.change.d7} />
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max((row.circulatingUsd / maxChain) * 100, 1.2)}%`,
                          background:
                            row.name === "Robinhood Chain" ? "#f97316" : CHAIN_COLORS[index % CHAIN_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-card/80">
            <CardHeader>
              <CardTitle>Robinhood Chain 历史</CardTitle>
              <CardDescription>stablecoincharts/Robinhood Chain</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                series={data.rhHistory}
                color="#f97316"
                emptyText="Robinhood Chain 稳定币历史暂不可用"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
