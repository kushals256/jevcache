/** Comprehensive validation — not part of published package. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import { loadConfig } from "../dist/config.js";
import { createApp } from "../dist/server.js";
import { classifyFreshness } from "../dist/freshness.js";
import { decidePolicy } from "../dist/policy.js";
import { CacheStore } from "../dist/store/sqlite.js";

process.env.MOCK_JEV = "1";
process.env.MOCK_UPSTREAM = "1";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "jev-validate-"));
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

async function makeApp(overrides = {}) {
  const cfg = { ...loadConfig(), ...overrides };
  cfg.mockJev = true;
  cfg.mockUpstream = true;
  cfg.openrouterApiKey = cfg.openrouterApiKey || "mock";
  cfg.dataDir = overrides.dataDir;
  return createApp(cfg);
}

async function chat(app, content, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer mock",
    ...(opts.headers || {}),
  };
  const body = {
    model: opts.model || "mock",
    temperature: opts.temperature ?? 0,
    messages: [{ role: "user", content }],
    ...opts.bodyExtra,
  };
  const res = await app.request("http://localhost/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const h = {};
  for (const [k, v] of res.headers) {
    if (k.toLowerCase().startsWith("x-jevcache")) h[k.toLowerCase()] = v;
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* */
  }
  return { status: res.status, h, json };
}

// Classifier
check("stable default", classifyFreshness("explain binary search") === "stable");
check(
  "stable: current best practice",
  classifyFreshness("what is the current best practice for retries") === "stable",
);
check("live: right now", classifyFreshness("spot price right now") === "live");
check("short: today weather", classifyFreshness("today's weather forecast") === "short");
check("durable: capital", classifyFreshness("capital of France") === "durable");

// Policy
const liveHot = decidePolicy(
  { messages: [{ role: "user", content: "live score right now" }], temperature: 0.9 },
  0.3,
  { freshnessMode: "on" },
);
check("live wins over exact_only", liveHot.mode === "bypass" && liveHot.reason === "freshness_live");

check(
  "stream bypass",
  decidePolicy({ messages: [{ role: "user", content: "x" }], stream: true }, 0.3).reason === "stream",
);
check(
  "tools bypass",
  decidePolicy({ messages: [{ role: "user", content: "x" }], tools: [] }, 0.3).reason === "tools",
);
check(
  "FRESHNESS_MODE=off volatile",
  decidePolicy(
    { messages: [{ role: "user", content: "current price of gold" }] },
    0.3,
    { freshnessMode: "off" },
  ).reason === "volatile",
);

{
  const dir = fs.mkdtempSync(path.join(root, "a-"));
  const { app, close, stats } = await makeApp({ dataDir: dir, freshnessMode: "on" });

  const m1 = await chat(app, "Explain mutexes simply please");
  const m1b = await chat(app, "Explain mutexes simply please");
  check(
    "exact identical → HIT exact",
    m1.h["x-jevcache"] === "MISS" && m1b.h["x-jevcache"] === "HIT" && m1b.h["x-jevcache-tier"] === "exact",
    `${m1.h["x-jevcache"]} → ${m1b.h["x-jevcache"]}/${m1b.h["x-jevcache-tier"]}`,
  );

  const p1 = await chat(app, "Explain binary search simply please");
  const p2 = await chat(app, "Please explain binary search simply");
  check(
    "stable paraphrase → HIT jev",
    p1.h["x-jevcache"] === "MISS" && p2.h["x-jevcache"] === "HIT" && p2.h["x-jevcache-tier"] === "jev",
    `${p1.h["x-jevcache"]} → ${p2.h["x-jevcache"]}/${p2.h["x-jevcache-tier"]}`,
  );

  const live = await chat(app, "what is the live score right now");
  check(
    "live → BYPASS freshness_live",
    live.h["x-jevcache"] === "BYPASS" && live.h["x-jevcache-reason"] === "freshness_live",
  );

  const by = await chat(app, "explain mutexes simply please", {
    headers: { "X-Jevcache-Bypass": "1" },
  });
  check(
    "client bypass header",
    by.h["x-jevcache"] === "BYPASS" && by.h["x-jevcache-reason"] === "client_bypass",
  );

  const st = await chat(app, "hello", { bodyExtra: { stream: true } });
  check("stream → BYPASS", st.h["x-jevcache"] === "BYPASS" && st.h["x-jevcache-reason"] === "stream");

  const tb = await chat(app, "hello", {
    bodyExtra: { tools: [{ type: "function", function: { name: "x" } }] },
  });
  check("tools → BYPASS", tb.h["x-jevcache"] === "BYPASS" && tb.h["x-jevcache-reason"] === "tools");

  const ht1 = await chat(app, "unique stable prompt for temp test xyz", { temperature: 0.9 });
  const ht2 = await chat(app, "unique stable prompt for temp test xyz", { temperature: 0.9 });
  check(
    "high temp exact_only still HIT exact",
    ht1.h["x-jevcache"] === "MISS" && ht2.h["x-jevcache"] === "HIT" && ht2.h["x-jevcache-tier"] === "exact",
  );

  const sh = await chat(app, "what is today's weather forecast");
  check(
    "short request tagged",
    sh.h["x-jevcache-freshness"] === "short",
    `freshness=${sh.h["x-jevcache-freshness"]} cache=${sh.h["x-jevcache"]}`,
  );

  await chat(app, "max age probe prompt abc");
  const aged = await chat(app, "max age probe prompt abc", {
    headers: { "X-Jevcache-Max-Age-Seconds": "0" },
  });
  check(
    "Max-Age-Seconds=0 rejects exact HIT",
    aged.h["x-jevcache"] === "MISS",
    `got ${aged.h["x-jevcache"]}/${aged.h["x-jevcache-tier"]}`,
  );

  const hz = await app.request("http://localhost/healthz");
  check("healthz", hz.status === 200);
  const stj = await app.request("http://localhost/stats.json");
  check("stats.json", stj.status === 200);
  const sj = await stj.json();
  check("stats has freshness_rejects", typeof sj.freshness_rejects === "number");
  check("stats hit_rate defined", typeof sj.hit_rate === "number");

  const r501 = await app.request("http://localhost/v1/responses", { method: "POST" });
  check("responses API 501", r501.status === 501);

  // live stale rate on live fixtures = 0
  check("live_stale_hit_rate=0", live.h["x-jevcache"] !== "HIT");
  check("freshness header on stable HIT", m1b.h["x-jevcache-freshness"] === "stable");

  close();
}

{
  const dir = fs.mkdtempSync(path.join(root, "off-"));
  const { app, close } = await makeApp({ dataDir: dir, freshnessMode: "off" });
  const a = await chat(app, "Explain sorting algorithms please");
  const b = await chat(app, "Please explain sorting algorithms");
  check(
    "off-mode paraphrase HIT jev",
    a.h["x-jevcache"] === "MISS" && b.h["x-jevcache"] === "HIT" && b.h["x-jevcache-tier"] === "jev",
  );
  const v = await chat(app, "what is the current price of ETH");
  check(
    "off-mode volatile bypass",
    v.h["x-jevcache"] === "BYPASS" && v.h["x-jevcache-reason"] === "volatile",
  );
  close();
}

{
  const dir = fs.mkdtempSync(path.join(root, "stale-"));
  const first = await makeApp({ dataDir: dir, freshnessMode: "on" });
  const q = "today's weather forecast for probe";
  await chat(first.app, q);
  first.close();

  const db = new DatabaseSync(path.join(dir, "jevcache.db"));
  db.prepare("UPDATE entries SET created_at = created_at - 2000000").run();
  db.close();

  const again = await makeApp({ dataDir: dir, freshnessMode: "on" });
  const staleHit = await chat(again.app, q);
  check(
    "aged short exact → MISS (freshness reject)",
    staleHit.h["x-jevcache"] === "MISS",
    `got ${staleHit.h["x-jevcache"]} rejects=${again.stats.freshness_rejects}`,
  );
  check(
    "freshness_rejects incremented",
    again.stats.freshness_rejects > 0,
    String(again.stats.freshness_rejects),
  );
  again.close();
}

{
  const dir = fs.mkdtempSync(path.join(root, "mig-"));
  const dbPath = path.join(dir, "jevcache.db");
  const old = new DatabaseSync(dbPath);
  old.exec(`
    CREATE TABLE entries (
      id TEXT PRIMARY KEY,
      namespace TEXT NOT NULL,
      exact_key TEXT NOT NULL UNIQUE,
      user_text TEXT NOT NULL,
      response_json TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      est_cost_usd REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);
  const now = Date.now();
  old.prepare(`INSERT INTO entries VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    "id1",
    "ns",
    "k1",
    "hello",
    "{}",
    "m",
    0,
    0,
    0,
    now,
    now + 60000,
  );
  old.close();
  const store = new CacheStore(dir);
  const e = store.getByExactKey("k1");
  check("migrate old schema rows", !!(e && e.freshness_class === "stable" && e.user_text === "hello"));
  store.upsert(
    {
      namespace: "ns",
      exact_key: "k2",
      user_text: "x",
      response_json: "{}",
      model: "m",
      prompt_tokens: 0,
      completion_tokens: 0,
      est_cost_usd: 0,
      created_at: now,
      expires_at: now + 60000,
      freshness_class: "short",
      as_of: now,
    },
    100,
  );
  check("migrate then upsert short", store.getByExactKey("k2")?.freshness_class === "short");
  store.close();
}

{
  const dir = fs.mkdtempSync(path.join(root, "sf-"));
  const { app, close, stats } = await makeApp({ dataDir: dir });
  const content = "singleflight coalesce unique prompt zzz";
  const [a, b] = await Promise.all([chat(app, content), chat(app, content)]);
  check("singleflight both succeed", a.status === 200 && b.status === 200);
  check(
    "singleflight coalesced or sequential HIT",
    stats.coalesced >= 1 ||
      (a.h["x-jevcache"] === "MISS" && b.h["x-jevcache"] === "HIT") ||
      (b.h["x-jevcache"] === "MISS" && a.h["x-jevcache"] === "HIT") ||
      (a.h["x-jevcache"] === "HIT" || b.h["x-jevcache"] === "HIT"),
    `coalesced=${stats.coalesced} a=${a.h["x-jevcache"]} b=${b.h["x-jevcache"]}`,
  );
  close();
}

{
  const dir = fs.mkdtempSync(path.join(root, "dur-"));
  const { app, close } = await makeApp({ dataDir: dir, ttlSeconds: 86400 });
  await chat(app, "what is the capital of France");
  const d2 = await chat(app, "what is the capital of France");
  check(
    "durable exact HIT",
    d2.h["x-jevcache"] === "HIT" && d2.h["x-jevcache-freshness"] === "durable",
  );
  close();
}

{
  // Demo prompts exactly as CLI uses
  const dir = fs.mkdtempSync(path.join(root, "demo-"));
  const { app, close } = await makeApp({ dataDir: dir });
  const d1 = await chat(app, "Explain mutexes simply please");
  const d2 = await chat(app, "Please explain mutexes simply");
  check(
    "CLI demo prompts MISS→HIT",
    d1.h["x-jevcache"] === "MISS" && d2.h["x-jevcache"] === "HIT",
    `${d1.h["x-jevcache"]} → ${d2.h["x-jevcache"]} (${d2.h["x-jevcache-tier"]})`,
  );
  close();
}

{
  // Different intents must MISS
  const dir = fs.mkdtempSync(path.join(root, "diff-"));
  const { app, close } = await makeApp({ dataDir: dir });
  await chat(app, "how do I reverse a linked list");
  const other = await chat(app, "how do I bake sourdough bread");
  check(
    "different intent → MISS",
    other.h["x-jevcache"] === "MISS",
    `got ${other.h["x-jevcache"]}/${other.h["x-jevcache-tier"]}`,
  );
  close();
}

const failed = results.filter((r) => !r.ok);
console.log("\n=== SUMMARY ===");
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("FAILURES:");
  for (const f of failed) console.log(" -", f.name, f.detail);
  fs.rmSync(root, { recursive: true, force: true });
  process.exit(1);
}
console.log("ALL CHECKS PASSED");
fs.rmSync(root, { recursive: true, force: true });
