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
import { formatShanghai, formatUsd } from "@/lib/format";
import type { IssuerRow } from "@/lib/types";
import { ChangeText } from "./change-pills";
import { IssuerLogo } from "./issuer-logo";

export function PlatformsTable({ issuers }: { issuers: IssuerRow[] }) {
  return (
    <Card className="border-white/5 bg-card/80">
      <CardHeader>
        <CardTitle>代币化股权平台</CardTitle>
        <CardDescription>
          发行方 / 平台 · DefiLlama 协议 TVL · 链 · 涨跌 · 来源。添加新发行方请编辑{" "}
          <code className="rounded bg-white/5 px-1">data/issuers.json</code>。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {issuers.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">暂无追踪发行方。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>发行方</TableHead>
                <TableHead className="text-right">AUM / TVL</TableHead>
                <TableHead>链</TableHead>
                <TableHead className="text-right">24h</TableHead>
                <TableHead className="text-right">7d</TableHead>
                <TableHead className="text-right">30d</TableHead>
                <TableHead>来源</TableHead>
                <TableHead className="text-right">更新</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuers.map((row) => (
                <TableRow key={row.slug}>
                  <TableCell>
                    <div className="flex min-w-52 items-center gap-2">
                      <IssuerLogo src={row.logoUrl} name={row.shortName} color={row.color} />
                      <div>
                        <div className="flex items-center gap-1.5 font-medium">
                          {row.displayName}
                          {row.featured ? (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                              核心
                            </Badge>
                          ) : null}
                          {row.discovered ? (
                            <Badge variant="outline" className="h-4 px-1 text-[10px]">
                              发现
                            </Badge>
                          ) : null}
                        </div>
                        {row.noteZh ? (
                          <div className="max-w-72 text-[11px] leading-snug text-muted-foreground">
                            {row.noteZh}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {row.tvlUsd == null ? (
                      <span className="text-muted-foreground">暂无 TVL</span>
                    ) : (
                      formatUsd(row.tvlUsd)
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {(row.chains.length ? row.chains : ["—"]).slice(0, 5).map((chain) => (
                        <Badge key={chain} variant="outline" className="font-normal">
                          {chain}
                        </Badge>
                      ))}
                      {row.chains.length > 5 ? (
                        <Badge variant="ghost">+{row.chains.length - 5}</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChangeText value={row.change.d1} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ChangeText value={row.change.d7} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ChangeText value={row.change.d30} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs">
                      <a
                        href={row.defillamaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-300 hover:underline"
                      >
                        DefiLlama
                      </a>
                      {row.projectUrl ? (
                        <a
                          href={row.projectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:underline"
                        >
                          官网
                        </a>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-muted-foreground">
                    {row.lastUpdated ? formatShanghai(row.lastUpdated) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
