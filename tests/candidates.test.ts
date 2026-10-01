/** SPDX-License-Identifier: MIT */
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CacheStore } from "../src/store/sqlite.js";
import {
  proposeCandidates,
  entryIdForChoice,
  tokenJaccard,
} from "../src/candidates.js";
import { createStats, summarize } from "../src/stats.js";

function tmpStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jev-cand-"));
  return { store: new CacheStore(dir), dir };
}

function seed(
  store: CacheStore,
  rows: { exact_key: string; user_text: string; created_at: number }[],
) {
  for (const r of rows) {
    store.upsert(
      {
        namespace: "ns",
        exact_key: r.exact_key,
        user_text: r.user_text,
        response_json: "{}",
        model: "m",
        prompt_tokens: 1,
        completion_tokens: 1,
        est_cost_usd: 0.001,
        created_at: r.created_at,
        expires_at: r.created_at + 86_400_000,
        freshness_class: "stable",
        as_of: r.created_at,
      },
      10_000,
    );
  }
}

describe("tokenJaccard", () => {
  it("scores overlap", () => {
    expect(tokenJaccard("explain mutexes simply", "please explain mutexes simply")).toBeGreaterThan(
      0.5,
    );
    expect(tokenJaccard("alpha", "zzz")).toBe(0);
  });
});

describe("proposeCandidates", () => {
  const stores: CacheStore[] = [];
  afterEach(() => {
    while (stores.length) stores.pop()!.close();
  });

  function boot() {
    const { store } = tmpStore();
    stores.push(store);
    return store;
  }

  it("recency returns newest K", () => {
    const store = boot();
    const now = Date.now();
    seed(store, [
      { exact_key: "k1", user_text: "old one", created_at: now - 3000 },
      { exact_key: "k2", user_text: "mid", created_at: now - 2000 },
      { exact_key: "k3", user_text: "new", created_at: now - 1000 },
    ]);
    const c = proposeCandidates({
      store,
      namespace: "ns",
      newText: "anything",
      k: 2,
      poolN: 10,
      excludeExactKey: "other",
      strategy: "recency",
      now,
    });
    expect(c.map((x) => x.text)).toEqual(["new", "mid"]);
    expect(c.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("hybrid keeps recency floor and fills with Jaccard", () => {
    const store = boot();
    const now = Date.now();
    seed(store, [
      {
        exact_key: "old-match",
        user_text: "Explain mutexes simply please",
        created_at: now - 10_000,
      },
      { exact_key: "d1", user_text: "weather in paris today", created_at: now - 4000 },
      { exact_key: "d2", user_text: "convert miles to km", created_at: now - 3000 },
      { exact_key: "d3", user_text: "what is dns", created_at: now - 2000 },
      { exact_key: "d4", user_text: "random unrelated topic", created_at: now - 1000 },
      { exact_key: "d5", user_text: "another distractor here", created_at: now - 500 },
    ]);
    const c = proposeCandidates({
      store,
      namespace: "ns",
      newText: "Please explain mutexes simply",
      k: 5,
      poolN: 64,
      excludeExactKey: "none",
      strategy: "hybrid",
      now,
    });
    expect(c.length).toBeLessThanOrEqual(5);
    // Floor: two newest distractors
    expect(c[0].text).toBe("another distractor here");
    expect(c[1].text).toBe("random unrelated topic");
    // Fill should include the older high-Jaccard mutex paraphrase
    expect(c.some((x) => x.text.includes("mutexes"))).toBe(true);
    const eid = entryIdForChoice(c, c.find((x) => x.text.includes("mutexes"))!.id);
    expect(eid).toBeTruthy();
  });

  it("hybrid does not pad with zero-Jaccard noise beyond floor", () => {
    const store = boot();
    const now = Date.now();
    seed(store, [
      { exact_key: "a", user_text: "zzzz totally different", created_at: now - 2000 },
      { exact_key: "b", user_text: "yyyy also different", created_at: now - 1000 },
    ]);
    const c = proposeCandidates({
      store,
      namespace: "ns",
      newText: "mutex lock explanation",
      k: 5,
      poolN: 10,
      excludeExactKey: "x",
      strategy: "hybrid",
      now,
    });
    // Only floor (2) — no positive Jaccard fill
    expect(c.length).toBe(2);
  });

  it("empty newText yields floor only under hybrid", () => {
    const store = boot();
    const now = Date.now();
    seed(store, [
      { exact_key: "a", user_text: "Explain mutexes simply please", created_at: now - 2000 },
      { exact_key: "b", user_text: "other", created_at: now - 1000 },
    ]);
    const c = proposeCandidates({
      store,
      namespace: "ns",
      newText: "   ",
      k: 5,
      poolN: 10,
      excludeExactKey: "x",
      strategy: "hybrid",
      now,
    });
    expect(c.length).toBe(2);
  });
});

describe("summarize eligible hit rate", () => {
  it("keeps overall hit_rate and adds eligible", () => {
    const s = createStats();
    s.requests = 8;
    s.hits_exact = 1;
    s.hits_jev = 1;
    s.misses = 2;
    s.bypasses = 4;
    const out = summarize(s);
    expect(out.hit_rate).toBe(2 / 8);
    expect(out.hit_rate_eligible).toBe(2 / 4);
    expect(out.bypass_share).toBe(4 / 8);
  });

  it("eligible is 0 when no hits or misses", () => {
    const s = createStats();
    s.requests = 3;
    s.bypasses = 3;
    const out = summarize(s);
    expect(out.hit_rate_eligible).toBe(0);
  });
});
