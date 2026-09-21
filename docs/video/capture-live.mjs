#!/usr/bin/env node
/** One-shot live capture for product video — starts server, runs MISS→HIT, writes summary, exits. */
import { spawn } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const PORT = process.env.PORT || "18085";
const HOST = "127.0.0.1";
const BASE = `http://${HOST}:${PORT}`;
const key = process.env.OPENROUTER_API_KEY || process.env.UPSTREAM_API_KEY;
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
if (!key) {
  console.error("missing OPENROUTER_API_KEY");
  process.exit(1);
}

await mkdir(dataDir, { recursive: true });

const child = spawn(
  process.execPath,
  ["--experimental-sqlite", path.join(root, "bin/jevcache.js"), "start"],
  {
    cwd: root,
    env: { ...process.env, PORT, HOST, DATA_DIR: dataDir, JEVCACHE_QUIET: "0", NODE_OPTIONS: "" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let srv = "";
child.stdout.on("data", (b) => {
  srv += b.toString();
  process.stderr.write(b);
});
child.stderr.on("data", (b) => {
  srv += b.toString();
  process.stderr.write(b);
});

async function waitHealthy(ms = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      if ((await fetch(`${BASE}/healthz`)).ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error("healthz timeout");
}

async function chat(content) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEMO_MODEL || "openai/gpt-4o-mini",
      temperature: 0,
      seed: 42,
      messages: [{ role: "user", content }],
    }),
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  const preview =
    body?.choices?.[0]?.message?.content?.replace(/\s+/g, " ").slice(0, 90) ?? "";
  return {
    ok: res.ok,
    status: res.status,
    ms,
    cache: res.headers.get("X-Jevcache") ?? "?",
    tier: res.headers.get("X-Jevcache-Tier") ?? "",
    intent: res.headers.get("X-Jevcache-Intent"),
    saved: res.headers.get("X-Jevcache-Saved-USD"),
    preview,
    content,
  };
}

function fmt(r) {
  const tag = r.tier && r.tier !== "none" ? `${r.cache} (${r.tier})` : r.cache;
  const bits = [
    `${r.ms}ms`,
    r.intent ? `intent ${Number(r.intent).toFixed(2)}` : null,
    r.saved && Number(r.saved) > 0 ? `saved $${Number(r.saved).toFixed(6)}` : null,
  ].filter(Boolean);
  return { tag, bits: bits.join("  ·  "), line: `  ${tag.padEnd(12)} ${bits.join("  ·  ")}` };
}

try {
  await waitHealthy();
  await sleep(400);

  const out = [];
  const p = (s) => {
    out.push(s);
    console.log(s);
  };

  p("");
  p("  $ npx @kushalicious/jevcache@0.1.6 start --demo");
  p("");
  p("  jevcache is running");
  p(`  Proxy   ${BASE}/v1`);
  p("  Mode    Jev same-intent + exact cache");
  p("");
  p("  Live demo — two paraphrases (expect MISS, then HIT)…");
  p("");

  const a = await chat("Explain mutexes simply please");
  const fa = fmt(a);
  p(fa.line);
  p(`           "${a.content}"`);
  p(`           ${a.preview}`);
  p("");

  await sleep(600);

  const b = await chat("Please explain mutexes simply");
  const fb = fmt(b);
  p(fb.line);
  p(`           "${b.content}"`);
  p(`           ${b.preview}`);
  p("");

  const stats = await fetch(`${BASE}/stats.json`).then((r) => r.json());
  const hits = (stats.hits_exact ?? 0) + (stats.hits_jev ?? 0);
  p("  $ curl -s localhost:8080/stats.json | jq .hit_rate");
  p(
    `  requests ${stats.requests}  ·  hits ${hits}  ·  hit_rate ${(stats.hit_rate * 100).toFixed(0)}%  ·  saved $${Number(stats.saved_usd ?? 0).toFixed(6)}`,
  );
  p("");

  if (a.cache !== "MISS" || b.cache !== "HIT") {
    console.error("CAPTURE_BAD", { a: a.cache, b: b.cache, tier: b.tier });
    process.exitCode = 2;
  } else {
    p("  CAPTURE_OK");
  }

  const summary = {
    missMs: a.ms,
    hitMs: b.ms,
    speedup: a.ms / Math.max(b.ms, 1),
    miss: a,
    hit: b,
    stats,
    transcript: out,
  };
  await writeFile(path.join(__dirname, "live-summary.json"), JSON.stringify(summary, null, 2));
  await writeFile(path.join(__dirname, "live-transcript.txt"), out.join("\n") + "\n");
} catch (e) {
  console.error("CAPTURE_FAIL", e);
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  await sleep(400);
  try {
    child.kill("SIGKILL");
  } catch {}
}
