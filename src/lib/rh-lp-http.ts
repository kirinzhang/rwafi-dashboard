import { settled } from "./llama";

const UA = "EquityTokenRadar/1.0 (research dashboard; +https://defillama.com)";

export async function fetchPublicJson<T>(url: string, timeoutMs = 25_000): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json", "User-Agent": UA },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`${url} → HTTP ${response.status}`);
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 3) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error(url);
}

export async function settledPublic<T>(label: string, url: string, warnings: string[]): Promise<T | null> {
  return settled(label, fetchPublicJson<T>(url), warnings);
}
