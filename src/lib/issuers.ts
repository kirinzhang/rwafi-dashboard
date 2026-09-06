import seed from "../../data/issuers.json";
import type { ProtocolListItem } from "./llama";

export type IssuerSeed = {
  slug: string;
  displayName: string;
  shortName: string;
  color: string;
  featured: boolean;
  noteZh: string;
  discovered?: boolean;
};

const FALLBACK_COLORS = [
  "#22c55e",
  "#8b9cff",
  "#f97316",
  "#14b8a6",
  "#f472b6",
  "#f59e0b",
  "#38bdf8",
  "#a78bfa",
];

export function loadIssuerSeeds(protocols: ProtocolListItem[]): IssuerSeed[] {
  const mapped = new Map<string, IssuerSeed>();
  for (const issuer of seed.issuers) {
    mapped.set(issuer.slug, { ...issuer, discovered: false });
  }

  if (seed.autoDiscover.enabled) {
    const pattern = new RegExp(seed.autoDiscover.nameOrSlugPattern, "i");
    const excluded = new Set(seed.excludeSlugs);
    for (const protocol of protocols) {
      if (excluded.has(protocol.slug)) continue;
      if (mapped.has(protocol.slug)) continue;
      if (protocol.category !== seed.autoDiscover.requiredCategory) continue;
      const blob = `${protocol.name} ${protocol.slug}`;
      if (!pattern.test(blob)) continue;
      mapped.set(protocol.slug, {
        slug: protocol.slug,
        displayName: protocol.name,
        shortName: protocol.name,
        color: FALLBACK_COLORS[mapped.size % FALLBACK_COLORS.length],
        featured: false,
        noteZh: "由 DefiLlama RWA + 股票/股权关键词自动发现",
        discovered: true,
      });
    }
  }

  return [...mapped.values()];
}
