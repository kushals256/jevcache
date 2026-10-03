/** SPDX-License-Identifier: MIT */
import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, type Config } from "../src/config.js";
import { createApp } from "../src/server.js";
import type { IntentAdjudicator } from "../src/adjudicator/types.js";
import {
  buildNamespace,
  exactKey,
  priorDigest,
  systemHash,
  temperatureBucket,
  toolsHash,
  turnNamespace,
  type ChatRequest,
} from "../src/fingerprint.js";

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

  it("stream final text stores then SSE HIT", async () => {
    const { app, stats } = boot(tmpCfg());
    const r = await chat(app, {
      stream: true,
      messages: [{ role: "user", content: "stream me" }],
    });
    expect(r.headers["x-jevcache"]).toBe("MISS");
    expect(r.text).toContain("data: [DONE]");
    const hit = await chat(app, {
      stream: true,
      messages: [{ role: "user", content: "stream me" }],
    });
    expect(hit.headers["x-jevcache"]).toBe("HIT");
    expect(hit.text).toContain("data: [DONE]");
    expect(stats.stream_hits).toBeGreaterThanOrEqual(1);
  });

  it("tools schema is eligible; tool_calls response is not stored", async () => {
    const { app, stats } = boot(tmpCfg());
    const r = await chat(app, {
      tools: [{ type: "function", function: { name: "x", parameters: {} } }],
      messages: [{ role: "user", content: "FORCE_TOOL_CALLS please" }],
    });
    expect(r.headers["x-jevcache"]).toBe("MISS");
    expect(r.headers["x-jevcache-reason"]).toBe("tool_calls");
    const again = await chat(app, {
      tools: [{ type: "function", function: { name: "x", parameters: {} } }],
      messages: [{ role: "user", content: "FORCE_TOOL_CALLS please" }],
    });
    expect(again.headers["x-jevcache"]).toBe("MISS");
    expect(stats.tool_calls_bypass).toBeGreaterThanOrEqual(1);
  });

  it("TURN_CACHE off bypasses tools", async () => {
    const { app } = boot(tmpCfg({ turnCache: false }));
    const r = await chat(app, {
      tools: [{ type: "function", function: { name: "x", parameters: {} } }],
      messages: [{ role: "user", content: "use a tool" }],
    });
    expect(r.headers["x-jevcache"]).toBe("BYPASS");
    expect(r.headers["x-jevcache-reason"]).toBe("tools");
  });

  it("empty tools array does not BYPASS", async () => {
    const { app } = boot(tmpCfg());
    const r = await chat(app, {
      tools: [],
      messages: [{ role: "user", content: "no tools attached" }],
    });
    expect(r.headers["x-jevcache"]).not.toBe("BYPASS");
    expect(["MISS", "HIT"]).toContain(r.headers["x-jevcache"]);
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

  it("same prior paraphrase is turn_jev", async () => {
    const { app } = boot(tmpCfg({ intentThreshold: 0.35 }));
    const prior = [
      { role: "system", content: "You are helpful" },
      {
        role: "assistant",
        content: "looking",
        tool_calls: [{ id: "c1", type: "function", function: { name: "search", arguments: "{}" } }],
      },
      { role: "tool", tool_call_id: "c1", content: "mutex = lock" },
    ];
    const a = await chat(app, { messages: [...prior, { role: "user", content: "Explain mutexes simply please" }] });
    const b = await chat(app, { messages: [...prior, { role: "user", content: "Please explain mutexes simply" }] });
    expect(a.headers["x-jevcache"]).toBe("MISS");
    expect(b.headers["x-jevcache"]).toBe("HIT");
    expect(b.headers["x-jevcache-tier"]).toBe("turn_jev");
  });

  it("different tool prior does not jev-hit", async () => {
    const { app } = boot(tmpCfg({ intentThreshold: 0.35 }));
    const base = [
      { role: "system", content: "You are helpful" },
      {
        role: "assistant",
        content: "looking",
        tool_calls: [{ id: "c1", type: "function", function: { name: "search", arguments: "{}" } }],
      },
    ];
    await chat(app, {
      messages: [...base, { role: "tool", tool_call_id: "c1", content: "mutex = lock" }, { role: "user", content: "Explain mutexes simply please" }],
    });
    const other = await chat(app, {
      messages: [
        ...base,
        { role: "tool", tool_call_id: "c1", content: "weather is rain" },
        { role: "user", content: "Please explain mutexes simply" },
      ],
    });
    expect(other.headers["x-jevcache"]).toBe("MISS");
  });

  it("Job-Id does not cross priors unless opted in", async () => {
    const priorA = [
      { role: "user", content: "setup" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "Explain mutexes simply please" },
    ];
    const priorB = [
      { role: "user", content: "other setup" },
      { role: "assistant", content: "different" },
      { role: "user", content: "Please explain mutexes simply" },
    ];
    const isolated = boot(tmpCfg({ intentThreshold: 0.35, jobCrossPrior: false }));
    await chat(isolated.app, { messages: priorA }, { "X-Jevcache-Job-Id": "job-a" });
    const no = await chat(isolated.app, { messages: priorB }, { "X-Jevcache-Job-Id": "job-a" });
    expect(no.headers["x-jevcache"]).not.toBe("HIT");

    const wide = boot(tmpCfg({ intentThreshold: 0.35, jobCrossPrior: true }));
    await chat(wide.app, { messages: priorA }, { "X-Jevcache-Job-Id": "job-a" });
    const yes = await chat(wide.app, { messages: priorB }, { "X-Jevcache-Job-Id": "job-a" });
    expect(yes.headers["x-jevcache"]).toBe("HIT");
    expect(yes.headers["x-jevcache-tier"]).toBe("turn_jev");
  });

  it("pending tool_calls prior skips the adjudicator; exact replay still hits", async () => {
    let calls = 0;
    const tracking: IntentAdjudicator = {
      name: "track",
      admit: async () => {
        calls += 1;
        return { ok: true, admit: true, noul: 1, best: "x", costUsd: 0 };
      },
    };
    const { app } = boot(tmpCfg({ intentThreshold: 0.35 }), { adjudicator: tracking });
    const pending = {
      role: "assistant",
      content: null,
      tool_calls: [{ id: "c1", type: "function", function: { name: "search", arguments: "{}" } }],
    };
    await chat(app, { messages: [pending, { role: "user", content: "Explain mutexes simply please" }] });
    calls = 0;
    const para = await chat(app, { messages: [pending, { role: "user", content: "Please explain mutexes simply" }] });
    expect(calls).toBe(0);
    expect(para.headers["x-jevcache"]).toBe("MISS");
    const again = await chat(app, { messages: [pending, { role: "user", content: "Explain mutexes simply please" }] });
    expect(again.headers["x-jevcache"]).toBe("HIT");
  });

  it("does not replay a stored tool_calls row", async () => {
    const cfg = tmpCfg();
    const { app, store } = boot(cfg);
    const body: ChatRequest = {
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "do not replay tools" }],
    };
    const digested = priorDigest(body.messages, { maxMessages: 64, maxBytes: 262144 });
    const ns = turnNamespace(
      buildNamespace({
        tenant: "poison",
        model: "openai/gpt-4o-mini",
        systemHash: systemHash(body.messages),
        toolsHash: toolsHash(body),
        temperatureBucket: temperatureBucket(undefined, cfg.temperatureMax),
      }),
      digested.digest,
      null,
      { crossPrior: false },
    );
    const now = Date.now();
    store.upsert(
      {
        namespace: ns,
        exact_key: exactKey(ns, body),
        user_text: "do not replay tools",
        response_json: JSON.stringify({
          choices: [
            {
              message: { role: "assistant", content: null, tool_calls: [{ id: "bad" }] },
              finish_reason: "tool_calls",
            },
          ],
        }),
        model: "openai/gpt-4o-mini",
        prompt_tokens: 1,
        completion_tokens: 1,
        est_cost_usd: 0.01,
        created_at: now,
        expires_at: now + 60_000,
      },
      1000,
    );
    const r = await chat(app, { messages: body.messages }, { "X-Jevcache-Tenant": "poison" });
    expect(r.headers["x-jevcache"]).toBe("MISS");
    expect(r.text).not.toContain("bad");
    expect(r.text).toContain("MOCK_ANSWER");
  });

  it("stream and non-stream share one stored answer", async () => {
    const { app } = boot(tmpCfg());
    const messages = [{ role: "user", content: "parity answer please unique" }];
    const streamFirst = await chat(app, { stream: true, messages });
    const asJson = await chat(app, { stream: false, messages });
    expect(streamFirst.text).toContain("data: [DONE]");
    expect(asJson.headers["x-jevcache"]).toBe("HIT");
    expect(asJson.text).toContain("MOCK_ANSWER");

    const { app: app2 } = boot(tmpCfg());
    const messages2 = [{ role: "user", content: "json first then stream" }];
    await chat(app2, { messages: messages2 });
    const asStream = await chat(app2, { stream: true, messages: messages2 });
    expect(asStream.headers["x-jevcache"]).toBe("HIT");
    expect(asStream.text).toContain("data: [DONE]");
  });

  it("TURN_CACHE off bypasses stream", async () => {
    const { app } = boot(tmpCfg({ turnCache: false }));
    const r = await chat(app, { stream: true, messages: [{ role: "user", content: "hi" }] });
    expect(r.headers["x-jevcache"]).toBe("BYPASS");
    expect(r.headers["x-jevcache-reason"]).toBe("stream");
  });

  it("bypasses logprobs, audio, forced tools, and missing user", async () => {
    const { app } = boot(tmpCfg());
    const logs = await chat(app, { logprobs: true, messages: [{ role: "user", content: "x" }] });
    const audio = await chat(app, { modalities: ["audio"], messages: [{ role: "user", content: "x" }] });
    const forced = await chat(app, {
      tool_choice: "required",
      tools: [{ type: "function", function: { name: "f" } }],
      messages: [{ role: "user", content: "x" }],
    });
    const none = await chat(app, { messages: [{ role: "system", content: "only system" }] });
    expect(logs.headers["x-jevcache-reason"]).toBe("logprobs");
    expect(audio.headers["x-jevcache-reason"]).toBe("audio");
    expect(forced.headers["x-jevcache-reason"]).toBe("tool_choice_forced");
    expect(none.headers["x-jevcache-reason"]).toBe("no_user_message");
  });

  it("rejects an oversized body", async () => {
    const { app } = boot(tmpCfg({ requestMaxBytes: 80 }));
    const r = await chat(app, { messages: [{ role: "user", content: "x".repeat(200) }] });
    expect(r.status).toBe(413);
  });

  it("healthz reports turn_cache and receipt is locked off loopback", async () => {
    const { app } = boot(tmpCfg());
    const hz = (await (await app.request("http://test/healthz")).json()) as { turn_cache: boolean };
    expect(hz.turn_cache).toBe(true);

    const locked = boot(tmpCfg({ host: "0.0.0.0", adminToken: "secret" }));
    const denied = await locked.app.request("http://test/receipt");
    expect(denied.status).toBe(401);
    const ok = await locked.app.request("http://test/receipt", { headers: { "X-Jevcache-Admin": "secret" } });
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { tool_calls_bypass: number; turn_cache: boolean };
    expect(body.turn_cache).toBe(true);
    expect(typeof body.tool_calls_bypass).toBe("number");
  });
});
