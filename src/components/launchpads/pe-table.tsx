"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMultiple, formatUsd } from "@/lib/format";
import type { PeDefinition, PeRow } from "@/lib/launchpad-types";

function kindLabel(kind: PeRow["numeratorKind"]): string {
  if (kind === "circulating_mcap") return "流通市值";
  if (kind === "first_party_mcap") return "官方市值";
  if (kind === "fdv") return "FDV";
  return "—";
}

export function PeTable({ definition, rows }: { definition: PeDefinition; rows: PeRow[] }) {
  return (
    <Card className="border-white/5 bg-card/80">
      <CardHeader className="border-b border-white/5">
        <CardTitle>{definition.titleZh}</CardTitle>
        <CardDescription className="leading-relaxed">{definition.formulaZh}</CardDescription>
        <p className="text-[11px] text-muted-foreground">
          {definition.pe7dZh} · {definition.pe30dZh}
        </p>
        <p className="text-[11px] text-amber-200/80">{definition.caveatZh}</p>
      </CardHeader>
      <CardContent className="pt-3">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 py-8 text-center text-sm text-muted-foreground">
            PE 表暂无数据
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>平台</TableHead>
                <TableHead>链</TableHead>
                <TableHead>市值口径</TableHead>
                <TableHead className="text-right">Mcap/FDV</TableHead>
                <TableHead className="text-right">Rev 7d</TableHead>
                <TableHead className="text-right">日均 7d</TableHead>
                <TableHead className="text-right">PE 7d</TableHead>
                <TableHead className="text-right">Rev 30d</TableHead>
                <TableHead className="text-right">日均 30d</TableHead>
                <TableHead className="text-right">PE 30d</TableHead>
                <TableHead>来源 / 缺失原因</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.padId}>
                  <TableCell>
                    <div className="font-medium">{row.displayName}</div>
                    {row.tokenSymbol ? (
                      <div className="text-[11px] text-muted-foreground">${row.tokenSymbol}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.chainName}</TableCell>
                  <TableCell>{kindLabel(row.numeratorKind)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(row.numeratorUsd)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(row.rev7d)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(row.avgDaily7d)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatMultiple(row.pe7d)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(row.rev30d)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(row.avgDaily30d)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatMultiple(row.pe30d)}</TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal text-[11px] leading-snug text-muted-foreground">
                    {row.missingZh ? <div className="text-amber-200/85">— {row.missingZh}</div> : null}
                    <div>{row.sourceZh}</div>
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
