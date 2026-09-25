/** SPDX-License-Identifier: MIT */
import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, type Config } from "../src/config.js";
import { createApp } from "../src/server.js";
import type { IntentAdjudicator } from "../src/adjudicator/types.js";

const prevMockUp = process.env.MOCK_UPSTREAM;
const prevMockJev = process.env.MOCK_JEV;

beforeAll(() => {
  process.env.MOCK_UPSTREAM = "1";
  process.env.MOCK_JEV = "1";
});
afterAll(() => {
  if (prevMockUp === undefined) delete process.env.MOCK_UPSTREAM;
  else process.env.MOCK_UPSTREAM = prevMockUp;
  if (prevMockJev === undefined) delete process.env.MOCK_JEV;
  else process.env.MOCK_JEV = prevMockJev;
});

function tmpCfg(over: Partial<Config> = {}): Config {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jev-srv-"));
  return {
    ...loadConfig(),
    dataDir: dir,
    mockJev: true,
    mockUpstream: true,
    openrouterApiKey: "",
    upstreamApiKey: "test",
    adjudicator: "mock",
    adjudicatorUrl: "",
    freshnessMode: "on",
    freshnessJevMinAgeMs: 300_000,
    ttlShortSeconds: 900,
    ttlSeconds: 86400,
    ttlLiveSeconds: 0,
    shadow: false,
    intentThreshold: 0.5,
    embeddingMode: "off",
    ...over,
  };
}

async function chat(
  app: ReturnType<typeof createApp>["app"],
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  const res = await app.request("http://test/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: "Bearer t", ...headers },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "hello" }],
      ...body,
    }),
  });
  const hdrs = Object.fromEntries(res.headers.entries());
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* stream / plain */
  }
  return { status: res.status, headers: hdrs, json, text };
}

const apps: ReturnType<typeof createApp>[] = [];
afterEach(() => {
  while (apps.length) apps.pop()!.close();
});

function boot(cfg: Config, deps?: Parameters<typeof createApp>[2]) {
  const a = createApp(cfg, {}, deps);
  apps.push(a);
  return a;
}

describe("createApp integration", () => {
  it("exact MISS then HIT", async () => {
    const { app, stats } = boot(tmpCfg());
    const m1 = await chat(app, { messages: [{ role: "user", content: "Explain mutexes" }] });
    expect(m1.headers["x-jevcache"]).toBe("MISS");
    const m2 = await chat(app, { messages: [{ role: "user", content: "Explain mutexes" }] });
    expect(m2.headers["x-jevcache"]).toBe("HIT");
    expect(m2.headers["x-jevcache-tier"]).toBe("exact");
    expect(stats.hits_exact).toBe(1);
  });

  it("stream → BYPASS, no store growth via HIT", async () => {
    const { app, stats } = boot(tmpCfg());
    const r = await chat(app, {
      stream: true,
      messages: [{ role: "user", content: "stream me" }],
    });
    expect(r.headers["x-jevcache"]).toBe("BYPASS");
    expect(r.headers["x-jevcache-reason"]).toBe("stream");
    expect(stats.bypasses).toBe(1);
  });

  it("tools → BYPASS", async () => {
    const { app } = boot(tmpCfg());
    const r = await chat(app, {
      tools: [{ type: "function", function: { name: "x", parameters: {} } }],
      messages: [{ role: "user", content: "use a tool" }],
    });
    expect(r.headers["x-jevcache"]).toBe("BYPASS");
    expect(r.headers["x-jevcache-reason"]).toBe("tools");
  });

  it("fail-open: adjudicator error → MISS, upstream still runs", async () => {
    const failing: IntentAdjudicator = {
      name: "fail",
      admit: async () => ({ ok: false, error: "boom", costUsd: 0 }),
    };
    const { app, stats } = boot(tmpCfg(), { adjudicator: failing });
    // seed a candidate via miss
    await chat(app, { messages: [{ role: "user", content: "Explain mutexes simply please" }] });
    const r = await chat(app, {
      messages: [{ role: "user", content: "Please explain mutexes simply" }],
    });
    expect(r.headers["x-jevcache"]).toBe("MISS");
    expect(stats.jev_errors).toBeGreaterThanOrEqual(1);
    expect(stats.hits_jev).toBe(0);
  });

  it("shadow: would-admit but never HIT jev", async () => {
    const { app, stats } = boot(tmpCfg({ shadow: true }));
    await chat(app, { messages: [{ role: "user", content: "Explain mutexes simply please" }] });
    const r = await chat(app, {
      messages: [{ role: "user", content: "Please explain mutexes simply" }],
    });
    // exact miss on paraphrase; shadow blocks jev HIT → MISS (new store) or exact if same
    expect(r.headers["x-jevcache"]).not.toBe("HIT");
    expect(stats.hits_jev).toBe(0);
  });

  it("tenant isolation", async () => {
    const { app } = boot(tmpCfg());
    await chat(
      app,
      { messages: [{ role: "user", content: "secret tenant a" }] },
      { "X-Jevcache-Tenant": "alice" },
    );
    const r = await chat(
      app,
      { messages: [{ role: "user", content: "secret tenant a" }] },
      { "X-Jevcache-Tenant": "bob" },
    );
    expect(r.headers["x-jevcache"]).toBe("MISS");
  });

  it("freshness_stale reason on refuse → miss", async () => {
    const { app, stats } = boot(tmpCfg({ freshnessJevMinAgeMs: 0 }));
    const text = "Explain mutexes for beginners";
    await chat(app, { messages: [{ role: "user", content: text }] });
    const r = await chat(
      app,
      { messages: [{ role: "user", content: text }] },
      { "X-Jevcache-Max-Age-Seconds": "0" },
    );
    expect(r.headers["x-jevcache"]).toBe("MISS");
    expect(stats.freshness_rejects).toBeGreaterThanOrEqual(1);
    expect(r.headers["x-jevcache-reason"]).toBe("freshness_stale");
  });

  it("high temperature → exact_only (no jev admit path needed for bypass of semantic)", async () => {
    const { app, stats } = boot(tmpCfg());
    await chat(app, {
      temperature: 0.9,
      messages: [{ role: "user", content: "Explain mutexes simply please" }],
    });
    const r = await chat(app, {
      temperature: 0.9,
      messages: [{ role: "user", content: "Please explain mutexes simply" }],
    });
    // paraphrase under exact_only → MISS (not jev HIT)
    expect(r.headers["x-jevcache"]).toBe("MISS");
    expect(stats.hits_jev).toBe(0);
  });

  it("n>1 → BYPASS", async () => {
    const { app } = boot(tmpCfg());
    const r = await chat(app, {
      n: 2,
      messages: [{ role: "user", content: "hi" }],
    });
    expect(r.headers["x-jevcache"]).toBe("BYPASS");
  });

  it("paraphrase → semantic HIT (mock adjudicator)", async () => {
    const { app, stats } = boot(tmpCfg({ intentThreshold: 0.5 }));
    await chat(app, {
      messages: [{ role: "user", content: "Explain mutexes simply please" }],
    });
    const r = await chat(app, {
      messages: [{ role: "user", content: "Please explain mutexes simply" }],
    });
    expect(r.headers["x-jevcache"]).toBe("HIT");
    expect(r.headers["x-jevcache-tier"]).toBe("jev");
    expect(stats.hits_jev).toBeGreaterThanOrEqual(1);
  });

  it("kev without OpenRouter still runs admit (injected)", async () => {
    let called = false;
    const tracking: IntentAdjudicator = {
      name: "kev",
      admit: async (req) => {
        called = true;
        return {
          ok: true,
          admit: true,
          noul: 0.99,
          best: req.candidates[0]?.id ?? "none",
          costUsd: 0,
        };
      },
    };
    const { app, stats } = boot(
      tmpCfg({
        mockJev: false,
        adjudicator: "kev",
        openrouterApiKey: "",
        intentThreshold: 0.5,
      }),
      { adjudicator: tracking },
    );
    await chat(app, {
      messages: [{ role: "user", content: "Explain mutexes simply please" }],
    });
    const r = await chat(app, {
      messages: [{ role: "user", content: "Please explain mutexes simply" }],
    });
    expect(called).toBe(true);
    expect(r.headers["x-jevcache"]).toBe("HIT");
    expect(stats.hits_jev).toBeGreaterThanOrEqual(1);
  });

  it("/healthz reports adjudicator metadata", async () => {
    const { app } = boot(tmpCfg());
    const res = await app.request("http://test/healthz");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      adjudicator: { name: string; kind: string; ready: boolean };
    };
    expect(body.ok).toBe(true);
    expect(body.adjudicator.name).toBe("mock");
    expect(body.adjudicator.kind).toBe("mock");
    expect(body.adjudicator.ready).toBe(true);
  });

  it("freshness_reuse_refused when reuse_fresh low", async () => {
    const refusing: IntentAdjudicator = {
      name: "mock",
      admit: async () => ({
        ok: true,
        admit: false,
        noul: 0.95,
        reuseFresh: 0.1,
        best: "a",
        costUsd: 0,
      }),
    };
    const { app, stats } = boot(
      tmpCfg({ freshnessJevMinAgeMs: 0, intentThreshold: 0.85 }),
      { adjudicator: refusing },
    );
    await chat(app, {
      messages: [{ role: "user", content: "Explain mutexes simply please" }],
    });
    const r = await chat(app, {
      messages: [{ role: "user", content: "Please explain mutexes simply" }],
    });
    expect(r.headers["x-jevcache"]).toBe("MISS");
    expect(stats.freshness_rejects).toBeGreaterThanOrEqual(1);
    expect(r.headers["x-jevcache-reason"]).toBe("freshness_reuse_refused");
  });
});
