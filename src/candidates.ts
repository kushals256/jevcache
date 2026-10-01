/** SPDX-License-Identifier: MIT */
import type { CacheStore } from "./store/sqlite.js";

export type RankedCandidate = {
  id: string;
  text: string;
  entryId: string;
  createdAt: number;
};

export type ProposeStrategy = "hybrid" | "recency";

const POOL_CLAMP = 256;
const ID_CLAMP = 26;

/** Token Jaccard — propose-only; never used as an admit decision. */
export function tokenJaccard(a: string, b: string): number {
  const A = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const B = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter || 1;
  return inter / union;
}

function assignIds(
  rows: { id: string; user_text: string; created_at: number }[],
): RankedCandidate[] {
  return rows.map((r, i) => ({
    id: String.fromCharCode(97 + i),
    text: r.user_text,
    entryId: r.id,
    createdAt: r.created_at,
  }));
}

/**
 * Shortlist cache entries for the adjudicator.
 * Similarity may propose; only IntentAdjudicator admits.
 */
export function proposeCandidates(opts: {
  store: CacheStore;
  namespace: string;
  newText: string;
  k: number;
  poolN: number;
  excludeExactKey: string;
  strategy: ProposeStrategy;
  maxAgeMs?: number;
  now?: number;
}): RankedCandidate[] {
  const kEff = Math.min(Math.max(0, opts.k), ID_CLAMP);
  if (kEff === 0) return [];
  const poolN = Math.min(Math.max(1, opts.poolN), POOL_CLAMP);
  const pool = opts.store.recentInNamespace(
    opts.namespace,
    poolN,
    opts.excludeExactKey,
    opts.now,
    opts.maxAgeMs,
  );

  let picked: typeof pool;
  if (opts.strategy === "recency") {
    picked = pool.slice(0, kEff);
  } else {
    const floorN = Math.min(2, kEff);
    const floor = pool.slice(0, floorN);
    const floorIds = new Set(floor.map((e) => e.id));
    const text = opts.newText.trim();
    const scored = text
      ? pool
          .filter((e) => !floorIds.has(e.id))
          .map((e) => ({ e, s: tokenJaccard(text, e.user_text) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s || b.e.created_at - a.e.created_at)
      : [];
    const fill = scored.slice(0, Math.max(0, kEff - floor.length)).map((x) => x.e);
    picked = [...floor, ...fill];
  }

  return assignIds(picked);
}

/** Compat: legacy newest-K shortlist. */
export function recentCandidates(
  store: CacheStore,
  namespace: string,
  k: number,
  excludeExactKey: string,
  opts?: { maxAgeMs?: number; now?: number },
): RankedCandidate[] {
  return proposeCandidates({
    store,
    namespace,
    newText: "",
    k,
    poolN: k,
    excludeExactKey,
    strategy: "recency",
    maxAgeMs: opts?.maxAgeMs,
    now: opts?.now,
  });
}

export function entryIdForChoice(candidates: RankedCandidate[], choice: string): string | null {
  return candidates.find((c) => c.id === choice)?.entryId ?? null;
}

/** Oldest candidate age among the set (for decide whether to ask reuse_fresh). */
export function maxCandidateAgeMs(candidates: RankedCandidate[], now = Date.now()): number {
  if (!candidates.length) return 0;
  return Math.max(...candidates.map((c) => Math.max(0, now - c.createdAt)));
}
