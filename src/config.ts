/** SPDX-License-Identifier: MIT */
export type Config = {
  port: number;
  host: string;
  dataDir: string;
  openrouterApiKey: string;
  jevModel: string;
  upstreamBaseUrl: string;
  upstreamApiKey: string;
  intentThreshold: number;
  candidateK: number;
  recentN: number;
  maxStateChars: number;
  temperatureMax: number;
  ttlSeconds: number;
  maxEntries: number;
  shadow: boolean;
  adminToken: string;
  rateLimitRpm: number;
  corsOrigin: string;
  upstreamTimeoutMs: number;
  /** Admit timeout (JEV_TIMEOUT_MS or ADJUDICATOR_TIMEOUT_MS). */
  jevTimeoutMs: number;
  mockUpstream: boolean;
  mockJev: boolean;
  /**
   * Intent adjudicator: jev (default) | mock | laya | laya-mlx | kev | systemone | local.
   * Aliases: ADJUDICATOR, ADJUDICATOR_BACKEND.
   */
  adjudicator: string;
  /**
   * For kind=jev: optional Decisions URL override (ADJUDICATOR_URL / JEV_DECISIONS_URL).
   * For System One kinds: base URL (normalized to …/v1/systemone).
   */
  adjudicatorUrl: string;
  /** Model id for System One kinds (ADJUDICATOR_MODEL). Jev still uses JEV_MODEL. */
  adjudicatorModel: string;
  /** Optional Bearer for System One (ADJUDICATOR_API_KEY). Empty = no Auth header. */
  adjudicatorApiKey: string;
  freshnessMode: "on" | "off";
  /**
   * Reserved — must NEVER alone produce a semantic HIT.
   * Embeddings may propose candidates later; only IntentAdjudicator admits.
   */
  embeddingMode: "off" | "openai";
  ttlLiveSeconds: number;
  ttlShortSeconds: number;
  ttlDurableSeconds: number;
  freshnessJevMinAgeMs: number;
  freshnessSampleBypass: number;
  freshnessJitterPct: number;
};

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function num(name: string, fallback: number): number {
  const v = env(name);
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function loadConfig(): Config {
  const host = env("HOST", "127.0.0.1");
  const ttlSeconds = num("TTL_SECONDS", 86400);
  const durableRaw = env("TTL_DURABLE_SECONDS");
  const ttlDurableSeconds = durableRaw ? Number(durableRaw) || ttlSeconds : ttlSeconds;
  const mode = env("FRESHNESS_MODE", "on").toLowerCase();
  return {
    port: num("PORT", 8080),
    host,
    dataDir: env("DATA_DIR", "./data"),
    openrouterApiKey: env("OPENROUTER_API_KEY"),
    jevModel: env("JEV_MODEL", "typesafe/jev-1.13"),
    upstreamBaseUrl: env("UPSTREAM_BASE_URL", "https://openrouter.ai/api/v1").replace(/\/$/, ""),
    upstreamApiKey: env("UPSTREAM_API_KEY"),
    intentThreshold: num("INTENT_THRESHOLD", 0.85),
    candidateK: num("CANDIDATE_K", 5),
    recentN: num("RECENT_N", 64),
    maxStateChars: num("MAX_DIFF_CHARS_TO_JEV", 12000),
    temperatureMax: num("TEMPERATURE_MAX", 0.3),
    ttlSeconds,
    maxEntries: num("MAX_ENTRIES", 10000),
    shadow: env("JEVCACHE_SHADOW", "0") === "1",
    adminToken: env("JEVCACHE_ADMIN_TOKEN"),
    rateLimitRpm: num("RATE_LIMIT_RPM", host === "127.0.0.1" || host === "localhost" ? 0 : 60),
    corsOrigin: env("CORS_ORIGIN"),
    upstreamTimeoutMs: num("UPSTREAM_TIMEOUT_MS", 120_000),
    jevTimeoutMs: num(
      "ADJUDICATOR_TIMEOUT_MS",
      num("JEV_TIMEOUT_MS", 30_000),
    ),
    mockUpstream: env("MOCK_UPSTREAM", "0") === "1",
    mockJev: env("MOCK_JEV", "0") === "1",
    adjudicator: env("ADJUDICATOR", env("ADJUDICATOR_BACKEND", "jev")).toLowerCase() || "jev",
    adjudicatorUrl: env("ADJUDICATOR_URL", env("JEV_DECISIONS_URL")),
    adjudicatorModel: env("ADJUDICATOR_MODEL"),
    adjudicatorApiKey: env("ADJUDICATOR_API_KEY"),
    freshnessMode: mode === "off" ? "off" : "on",
    embeddingMode: env("EMBEDDING_MODE", "off") === "openai" ? "openai" : "off",
    ttlLiveSeconds: num("TTL_LIVE_SECONDS", 0),
    ttlShortSeconds: num("TTL_SHORT_SECONDS", 900),
    ttlDurableSeconds,
    freshnessJevMinAgeMs: num("FRESHNESS_JEV_MIN_AGE_MS", 300_000),
    freshnessSampleBypass: Math.min(1, Math.max(0, num("FRESHNESS_SAMPLE_BYPASS", 0))),
    freshnessJitterPct: Math.min(0.5, Math.max(0, num("FRESHNESS_TTL_JITTER", 0.1))),
  };
}
