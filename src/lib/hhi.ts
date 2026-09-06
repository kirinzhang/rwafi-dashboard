export function herfindahlHirschmanIndex(values: number[]): number {
  const positive = values.filter((v) => Number.isFinite(v) && v > 0);
  const total = positive.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return 0;
  return positive.reduce((sum, v) => {
    const sharePct = (v / total) * 100;
    return sum + sharePct * sharePct;
  }, 0);
}

export function concentrationTag(hhi: number): {
  zh: string;
  en: string;
} {
  if (hhi >= 2500) return { zh: "高度集中", en: "highly concentrated" };
  if (hhi >= 1500) return { zh: "中度集中", en: "moderately concentrated" };
  return { zh: "竞争充分", en: "competitive" };
}
