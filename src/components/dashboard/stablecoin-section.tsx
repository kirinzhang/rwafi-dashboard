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
import type { StablesPayload } from "@/lib/types";
import { ChangePills, ChangeText } from "./change-pills";
import { TrendChart } from "./trend-chart";

export function StablecoinSection({ data }: { data: StablesPayload["stables"] }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">稳定币发行</h2>
          <p className="text-sm text-muted-foreground">
            全球流通、按币种、按链，以及 Robinhood Chain 专表。美元稳定币（peggedUSD）。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card className="border-white/5 bg-card/80">
          <CardHeader>
            <CardTitle>全球稳定币流通趋势</CardTitle>
            <CardDescription>stablecoincharts/all · totalCirculatingUSD.peggedUSD</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart series={data.globalHistory} color="#38bdf8" emptyText="全球稳定币历史暂不可用" />
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-card/80">
          <CardHeader>
            <CardTitle>Robinhood Chain 稳定币历史</CardTitle>
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

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card className="border-white/5 bg-card/80">
          <CardHeader>
            <CardTitle>稳定币流通排名</CardTitle>
            <CardDescription>Top 12 · circulating peggedUSD</CardDescription>
          </CardHeader>
          <CardContent>
            {data.top.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无稳定币数据。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>稳定币</TableHead>
                    <TableHead className="text-right">流通</TableHead>
                    <TableHead>涨跌</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                          <div>
                            <div className="font-medium">
                              {row.symbol}{" "}
                              <span className="font-normal text-muted-foreground">{row.name}</span>
                            </div>
                            {row.pegMechanism ? (
                              <div className="text-[11px] text-muted-foreground">{row.pegMechanism}</div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatUsd(row.circulatingUsd)}
                      </TableCell>
                      <TableCell>
                        <ChangePills change={row.change} compact />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-card/80">
          <CardHeader>
            <CardTitle>稳定币按链</CardTitle>
            <CardDescription>
              高亮 Ethereum / Solana / Tron / Base / Arbitrum / <strong>Robinhood Chain</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.byChain.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无分链数据。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>链</TableHead>
                    <TableHead className="text-right">美元稳定币</TableHead>
                    <TableHead className="text-right">涨跌</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byChain.map((row) => (
                    <TableRow
                      key={row.name}
                      className={row.name === "Robinhood Chain" ? "bg-orange-400/5" : undefined}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{row.name}</span>
                          {row.highlighted ? (
                            <Badge variant={row.name === "Robinhood Chain" ? "default" : "secondary"}>
                              {row.name === "Robinhood Chain" ? "RH Chain" : "重点"}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatUsd(row.circulatingUsd)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.name === "Robinhood Chain" ? (
                          <ChangePills change={row.change} compact />
                        ) : (
                          <ChangeText value={null} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
