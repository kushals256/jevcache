/** SPDX-License-Identifier: MIT */
import type { CacheStore } from "./store/sqlite.js";

export type RankedCandidate = {
  id: string;
  text: string;
  entryId: string;
  createdAt: number;
};

export function recentCandidates(
  store: CacheStore,
  namespace: string,
  k: number,
  excludeExactKey: string,
  opts?: { maxAgeMs?: number; now?: number },
): RankedCandidate[] {
  const rows = store.recentInNamespace(
    namespace,
    k,
    excludeExactKey,
    opts?.now,
    opts?.maxAgeMs,
  );
  return rows.map((r, i) => ({
    id: String.fromCharCode(97 + i),
    text: r.user_text,
    entryId: r.id,
    createdAt: r.created_at,
  }));
}

export function entryIdForChoice(candidates: RankedCandidate[], choice: string): string | null {
  return candidates.find((c) => c.id === choice)?.entryId ?? null;
}

/** Oldest candidate age among the set (for decide whether to ask reuse_fresh). */
export function maxCandidateAgeMs(candidates: RankedCandidate[], now = Date.now()): number {
  if (!candidates.length) return 0;
  return Math.max(...candidates.map((c) => Math.max(0, now - c.createdAt)));
}
