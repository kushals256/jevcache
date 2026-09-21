/** SPDX-License-Identifier: MIT */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  classifyFreshness,
  isFreshEnough,
  ttlMsForClass,
  type FreshnessTtls,
} from "../src/freshness.js";
import { decidePolicy } from "../src/policy.js";
import { ADMIT_SCHEMA_VERSION, admitSameIntent } from "../src/jev_admit.js";
import { CacheStore } from "../src/store/sqlite.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TTLS: FreshnessTtls = {
  liveSeconds: 0,
  shortSeconds: 900,
  stableSeconds: 86400,
  durableSeconds: 86400,
};

describe("freshness classifier (precision-first)", () => {
  it("defaults cue-less prompts to stable", () => {
    expect(classifyFreshness("explain binary search")).toBe("stable");
    expect(classifyFreshness("what is the current best practice for retries")).toBe("stable");
    expect(classifyFreshness("refactor this function")).toBe("stable");
  });

  it("flags live cues", () => {
    expect(classifyFreshness("what is the bitcoin spot price right now")).toBe("live");
    expect(classifyFreshness("live score for the match")).toBe("live");
  });

  it("flags short-horizon cues", () => {
    expect(classifyFreshness("what is today's weather forecast")).toBe("short");
    expect(classifyFreshness("bitcoin price")).toBe("short");
    expect(classifyFreshness("breaking news headlines today")).toBe("short");
  });

  it("flags durable evergreen cues", () => {
    expect(classifyFreshness("what is the capital of France")).toBe("durable");
    expect(classifyFreshness("definition of idempotent")).toBe("durable");
  });

  it("live TTL is zero; short is 15m", () => {
    expect(ttlMsForClass("live", TTLS, 0)).toBe(0);
    expect(ttlMsForClass("short", TTLS, 0)).toBe(900_000);
    expect(isFreshEnough(Date.now() - 60_000, "short", TTLS)).toBe(true);
    expect(isFreshEnough(Date.now() - 20 * 60_000, "short", TTLS)).toBe(false);
  });
});

describe("policy + freshness", () => {
  it("live bypasses even with high temperature", () => {
    const r = decidePolicy(
      {
        messages: [{ role: "user", content: "live score for the game right now" }],
        temperature: 0.9,
      },
      0.3,
      { freshnessMode: "on" },
    );
    expect(r.mode).toBe("bypass");
    expect(r.reason).toBe("freshness_live");
    expect(r.freshness).toBe("live");
  });

  it("stable stays full", () => {
    const r = decidePolicy(
      { messages: [{ role: "user", content: "explain merge sort" }], temperature: 0 },
      0.3,
      { freshnessMode: "on" },
    );
    expect(r.mode).toBe("full");
    expect(r.freshness).toBe("stable");
  });

  it("FRESHNESS_MODE=off uses legacy volatile regex", () => {
    const r = decidePolicy(
      { messages: [{ role: "user", content: "current price of gold" }], temperature: 0 },
      0.3,
      { freshnessMode: "off" },
    );
    expect(r.mode).toBe("bypass");
    expect(r.reason).toBe("volatile");
  });

  it("still bypasses stream/tools", () => {
    expect(
      decidePolicy({ messages: [{ role: "user", content: "x" }], stream: true }, 0.3).mode,
    ).toBe("bypass");
  });
});

describe("admit-v2", () => {
  it("schema is admit-v2", () => {
    expect(ADMIT_SCHEMA_VERSION).toBe("admit-v2");
  });

  it("MOCK_JEV admits young paraphrases without reuse_fresh", async () => {
    process.env.MOCK_JEV = "1";
    const r = await admitSameIntent({
      apiKey: "mock",
      model: "m",
      newText: "how do I sort an array in python",
      candidates: [{ id: "a", text: "python sort an array how" }],
      threshold: 0.3,
      maxStateChars: 4000,
      timeoutMs: 1000,
      askReuseFresh: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.admit).toBe(true);
    delete process.env.MOCK_JEV;
  });
});

describe("store freshness columns", () => {
  let dir: string;
  let store: CacheStore;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jevcache-"));
    store = new CacheStore(dir);
  });
  afterEach(() => {
    store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("persists freshness_class and as_of", () => {
    const now = Date.now();
    const e = store.upsert(
      {
        namespace: "ns",
        exact_key: "k",
        user_text: "hello",
        response_json: "{}",
        model: "m",
        prompt_tokens: 0,
        completion_tokens: 0,
        est_cost_usd: 0,
        created_at: now,
        expires_at: now + 60_000,
        freshness_class: "short",
        as_of: now,
      },
      100,
    );
    expect(e.freshness_class).toBe("short");
    expect(e.as_of).toBe(now);
    expect(store.getByExactKey("k")?.freshness_class).toBe("short");
  });

  it("age-filters recentInNamespace", () => {
    const now = Date.now();
    store.upsert(
      {
        namespace: "ns",
        exact_key: "old",
        user_text: "old",
        response_json: "{}",
        model: "m",
        prompt_tokens: 0,
        completion_tokens: 0,
        est_cost_usd: 0,
        created_at: now - 3_600_000,
        expires_at: now + 86_400_000,
        freshness_class: "stable",
      },
      100,
    );
    store.upsert(
      {
        namespace: "ns",
        exact_key: "new",
        user_text: "new",
        response_json: "{}",
        model: "m",
        prompt_tokens: 0,
        completion_tokens: 0,
        est_cost_usd: 0,
        created_at: now - 1_000,
        expires_at: now + 86_400_000,
        freshness_class: "stable",
      },
      100,
    );
    const young = store.recentInNamespace("ns", 10, undefined, now, 60_000);
    expect(young.map((r) => r.exact_key)).toEqual(["new"]);
  });
});
