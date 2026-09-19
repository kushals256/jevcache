/** SPDX-License-Identifier: MIT */
export type Stats = {
  requests: number;
  hits_exact: number;
  hits_jev: number;
  misses: number;
  bypasses: number;
  jev_errors: number;
  upstream_errors: number;
  coalesced: number;
  jev_spend_usd: number;
  upstream_spend_usd: number;
  saved_usd: number;
  latency_hit_ms: number[];
  latency_miss_ms: number[];
  last_hits: { tier: string; preview: string; intent?: number; at: number }[];
  started_at: number;
};

export function createStats(): Stats {
  return {
    requests: 0,
    hits_exact: 0,
    hits_jev: 0,
    misses: 0,
    bypasses: 0,
    jev_errors: 0,
    upstream_errors: 0,
    coalesced: 0,
    jev_spend_usd: 0,
    upstream_spend_usd: 0,
    saved_usd: 0,
    latency_hit_ms: [],
    latency_miss_ms: [],
    last_hits: [],
    started_at: Date.now(),
  };
}

function percentile(arr: number[], p: number): number | null {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[idx];
}

export function summarize(stats: Stats) {
  const hits = stats.hits_exact + stats.hits_jev;
  const denom = stats.requests || 1;
  return {
    ...stats,
    hit_rate: hits / denom,
    p50_hit_ms: percentile(stats.latency_hit_ms, 50),
    p95_hit_ms: percentile(stats.latency_hit_ms, 95),
    p50_miss_ms: percentile(stats.latency_miss_ms, 50),
    p95_miss_ms: percentile(stats.latency_miss_ms, 95),
    net_saved_usd: stats.saved_usd - stats.jev_spend_usd,
    cost_inversion_warning: stats.saved_usd > 0 && stats.jev_spend_usd > stats.saved_usd * 0.5,
  };
}

export function pushLatency(arr: number[], ms: number, cap = 500): void {
  arr.push(ms);
  if (arr.length > cap) arr.splice(0, arr.length - cap);
}

export function recordHit(
  stats: Stats,
  tier: "exact" | "jev",
  preview: string,
  intent?: number,
): void {
  stats.last_hits.unshift({ tier, preview, intent, at: Date.now() });
  if (stats.last_hits.length > 10) stats.last_hits.length = 10;
}
