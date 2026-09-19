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
  embeddingMode: "off" | "openai";
  adminToken: string;
  rateLimitRpm: number;
  corsOrigin: string;
  upstreamTimeoutMs: number;
  jevTimeoutMs: number;
  mockUpstream: boolean;
  mockJev: boolean;
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
    ttlSeconds: num("TTL_SECONDS", 86400),
    maxEntries: num("MAX_ENTRIES", 10000),
    shadow: env("JEVCACHE_SHADOW", "0") === "1",
    embeddingMode: env("EMBEDDING_MODE", "off") === "openai" ? "openai" : "off",
    adminToken: env("JEVCACHE_ADMIN_TOKEN"),
    rateLimitRpm: num("RATE_LIMIT_RPM", host === "127.0.0.1" || host === "localhost" ? 0 : 60),
    corsOrigin: env("CORS_ORIGIN"),
    upstreamTimeoutMs: num("UPSTREAM_TIMEOUT_MS", 120_000),
    jevTimeoutMs: num("JEV_TIMEOUT_MS", 30_000),
    mockUpstream: env("MOCK_UPSTREAM", "0") === "1",
    mockJev: env("MOCK_JEV", "0") === "1",
  };
}
