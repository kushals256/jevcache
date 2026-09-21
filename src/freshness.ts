/** SPDX-License-Identifier: MIT */
/**
 * Precision-first temporal freshness classifier.
 * Prefer false-negative (treat as stable) over false-positive (over-short TTL).
 * Order: live → short → durable → stable (default).
 */

export type FreshnessClass = "live" | "short" | "stable" | "durable";

export type FreshnessTtls = {
  liveSeconds: number;
  shortSeconds: number;
  stableSeconds: number;
  durableSeconds: number;
};

/** Live / real-time: must not be served stale. Wins over exact_only. */
const LIVE_RE =
  /\b(right\s+now|live\s+(score|odds|price|quote|feed)|as\s+of\s+now|this\s+(second|minute)|current\s+(price|quote|score|odds|rate)|spot\s+price|latest\s+(tick|quote))\b/i;

/**
 * Short-horizon: news, weather, sports standings, market quotes, “today/this week”.
 * Keep narrow — “current best practice” alone is NOT short (stable).
 */
const SHORT_RE =
  /\b(today'?s?\s+(news|headlines|weather|score|scores|standings|odds|forecast)|this\s+(morning|afternoon|evening|week)\b|breaking\s+news|weather\s+(today|now|forecast)|stock\s+(price|quote)|share\s+price|crypto\s+(price|quote)|bitcoin\s+price|eth(ereum)?\s+price|fx\s+rate|exchange\s+rate\s+(today|now)|sports?\s+(score|scores|standings|odds)|live\s+standings|what'?s\s+the\s+(score|weather|price)\b|news\s+(today|headlines)|headline(s)?\s+(today|now))\b/i;

/** Durable: evergreen facts; default TTL matches stable unless DURABLE_TTL set higher. */
const DURABLE_RE =
  /\b(capital\s+of|population\s+of|who\s+(invented|discovered|wrote|painted)|when\s+was\s+.+\s+(born|founded|released)|definition\s+of|what\s+does\s+.+\s+mean|etymology|boiling\s+point\s+of|chemical\s+formula|atomic\s+number|speed\s+of\s+light|pi\s+to\s+\d+|historical\s+fact)\b/i;

export function classifyFreshness(text: string): FreshnessClass {
  const t = text.trim();
  if (!t) return "stable";
  if (LIVE_RE.test(t)) return "live";
  if (SHORT_RE.test(t)) return "short";
  if (DURABLE_RE.test(t)) return "durable";
  return "stable";
}

/** ±jitterPct uniform jitter so expiry waves do not stampede. */
export function ttlMsForClass(
  cls: FreshnessClass,
  ttls: FreshnessTtls,
  jitterPct = 0.1,
): number {
  const baseSec =
    cls === "live"
      ? ttls.liveSeconds
      : cls === "short"
        ? ttls.shortSeconds
        : cls === "durable"
          ? ttls.durableSeconds
          : ttls.stableSeconds;
  const base = Math.max(0, baseSec) * 1000;
  if (base === 0 || jitterPct <= 0) return base;
  const j = Math.min(0.5, Math.max(0, jitterPct));
  const factor = 1 + (Math.random() * 2 - 1) * j;
  return Math.max(0, Math.round(base * factor));
}

export function ageMs(createdAt: number, now = Date.now()): number {
  return Math.max(0, now - createdAt);
}

/** Linear decay 1→0 over the class TTL (helpers / future threshold bumps). */
export function ageDecayFactor(ageMsValue: number, ttlMs: number): number {
  if (ttlMs <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - ageMsValue / ttlMs));
}

export function isFreshEnough(
  createdAt: number,
  cls: FreshnessClass,
  ttls: FreshnessTtls,
  now = Date.now(),
): boolean {
  const ttl = ttlMsForClass(cls, ttls, 0); // deterministic check uses nominal TTL
  if (ttl === 0) return false;
  return ageMs(createdAt, now) < ttl;
}
