export interface HealthCheckable {
  url?: string;
  healthPath: string;
}

/**
 * Server-side probe used to decide the LIVE/SOON badge on /core. This is
 * the one place a "we are Fred Core checking you" signal can actually be
 * attached — an <iframe src> is a bare browser navigation and cannot carry
 * custom headers, so x-fred-core-embed rides on this fetch instead, not on
 * the iframe itself.
 */
export async function isAppHealthy(app: HealthCheckable): Promise<boolean> {
  if (!app.url) return false;

  try {
    const target = new URL(app.healthPath, app.url).toString();
    const response = await fetch(target, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
      headers: { "x-fred-core-embed": "true" },
    });
    return response.ok;
  } catch {
    return false;
  }
}
