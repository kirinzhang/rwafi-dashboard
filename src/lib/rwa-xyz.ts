/**
 * Optional rwa.xyz / paid RWA feed stub.
 * The MVP never calls a paid API. If RWA_XYZ_API_KEY is later set,
 * a future client can replace tweet-snapshot comparison rows with live issuer AUM.
 */
export function isRwaXyzConfigured(): boolean {
  return Boolean(process.env.RWA_XYZ_API_KEY?.trim());
}

export async function fetchRwaXyzIssuers(): Promise<null> {
  if (!isRwaXyzConfigured()) return null;
  // Intentionally unused in MVP — keep free DefiLlama protocol TVL as the live source.
  return null;
}
