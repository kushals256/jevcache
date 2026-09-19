/** SPDX-License-Identifier: MIT */
import type { CacheStore } from "./store/sqlite.js";

export type RankedCandidate = {
  id: string;
  text: string;
  entryId: string;
};

export function recentCandidates(
  store: CacheStore,
  namespace: string,
  k: number,
  excludeExactKey: string,
): RankedCandidate[] {
  const rows = store.recentInNamespace(namespace, k, excludeExactKey);
  return rows.map((r, i) => ({
    id: String.fromCharCode(97 + i),
    text: r.user_text,
    entryId: r.id,
  }));
}

export function entryIdForChoice(candidates: RankedCandidate[], choice: string): string | null {
  return candidates.find((c) => c.id === choice)?.entryId ?? null;
}
