/**
 * End-to-end validation for 0.3.0 System One path (no real Kev required).
 * Run: node --experimental-sqlite scripts/validate_systemone.mjs
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../dist/config.js";
import { createApp } from "../dist/server.js";
import {
  adjudicatorReady,
  resolveAdjudicatorKind,
  createAdjudicator,
  normalizeSystemOneUrl,
} from "../dist/adjudicator/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

// forwardChatCompletions mocks only when this env is set (same as vitest suite)
process.env.MOCK_UPSTREAM = "1";

function check(name, cond, detail = "") {
  if (cond) console.log(`  PASS  ${name}${detail ? " — " + detail : ""}`);
  else {
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
    failures.push(name);
  }
}

function listen(server) {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
}

async function chat(app, content) {
  const res = await app.request("http://test/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: "Bearer t" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content }],
    }),
  });
  return {
    status: res.status,
    hit: res.headers.get("x-jevcache"),
    tier: res.headers.get("x-jevcache-tier"),
    reason: res.headers.get("x-jevcache-reason"),
  };
}

console.log("jevcache 0.3.0 validation\n");

console.log("1. Factory / ready gate");
{
  const cfg = {
    ...loadConfig(),
    adjudicator: "kev",
    openrouterApiKey: "",
    mockUpstream: true,
    mockJev: false,
    adjudicatorUrl: "",
    adjudicatorModel: "",
  };
  check("kind=kev", resolveAdjudicatorKind(cfg) === "kev");
  check("ready without OR key", adjudicatorReady(cfg) === true);
  check("create name=kev", createAdjudicator(cfg).name === "kev");
  check(
    "normalize URL",
    normalizeSystemOneUrl("127.0.0.1:8008") === "http://127.0.0.1:8008/v1/systemone",
  );
  check("jev not ready without key", adjudicatorReady({ ...cfg, adjudicator: "jev" }) === false);
}

console.log("\n2. Live admit via mock System One (no OpenRouter)");
let sawCriteria = false;
let sawTextLabel = false;
const s1 = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const parsed = JSON.parse(body || "{}");
    sawCriteria = !!parsed?.questions?.same_intent?.criteria;
    const label = parsed?.questions?.best?.criteria?.a || "";
    sawTextLabel = /mutex/i.test(label);
    const ids = Object.keys(parsed?.questions?.best?.criteria || {}).filter((k) => k !== "none");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        answers: {
          same_intent: { noul: 0.96 },
          best: { choice: ids[0] || "none" },
        },
      }),
    );
  });
});
const s1Port = await listen(s1);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "jev-val-"));

const cfg = {
  ...loadConfig(),
  dataDir,
  port: 0,
  host: "127.0.0.1",
  mockUpstream: true,
  mockJev: false,
  openrouterApiKey: "",
  upstreamApiKey: "test",
  adjudicator: "kev",
  adjudicatorUrl: `http://127.0.0.1:${s1Port}`,
  adjudicatorModel: "kev-latest",
  adjudicatorApiKey: "",
  intentThreshold: 0.85,
  freshnessMode: "on",
  freshnessJevMinAgeMs: 300_000,
  shadow: false,
};

const { app, stats, close } = createApp(cfg);

const hz = await app.request("http://test/healthz");
const hzBody = await hz.json();
check("healthz ok", hzBody.ok === true);
check("healthz kind=kev", hzBody.adjudicator?.kind === "kev", JSON.stringify(hzBody.adjudicator));
check("healthz ready", hzBody.adjudicator?.ready === true);

const m1 = await chat(app, "Explain mutexes simply please");
check("first call MISS", m1.hit === "MISS", `got ${m1.hit}`);

const m2 = await chat(app, "Please explain mutexes simply");
check(
  "paraphrase semantic HIT",
  m2.hit === "HIT" && m2.tier === "jev",
  `hit=${m2.hit} tier=${m2.tier}`,
);
check("hits_jev incremented", stats.hits_jev >= 1, `hits_jev=${stats.hits_jev}`);
check("S1 got noul criteria", sawCriteria);
check("S1 got text choice labels", sawTextLabel);

close();
await new Promise((r) => s1.close(r));

console.log("\n3. Fail-open when System One is down");
const dataDir2 = fs.mkdtempSync(path.join(os.tmpdir(), "jev-val2-"));
const cfg2 = {
  ...cfg,
  dataDir: dataDir2,
  adjudicatorUrl: "http://127.0.0.1:1",
};
const app2 = createApp(cfg2);
await chat(app2.app, "Explain mutexes simply please");
const down = await chat(app2.app, "Please explain mutexes simply");
check("S1 down → MISS (fail-open)", down.hit === "MISS", `got ${down.hit}`);
check("jev_errors recorded", app2.stats.jev_errors >= 1, `errors=${app2.stats.jev_errors}`);
app2.close();

console.log("\n4. CLI doctor (config check)");
const doc = spawnSync(
  process.execPath,
  ["--experimental-sqlite", "dist/cli.js", "doctor"],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      ADJUDICATOR: "kev",
      OPENROUTER_API_KEY: "",
      MOCK_UPSTREAM: "1",
      NO_COLOR: "1",
      JEVCACHE_NO_COLOR: "1",
    },
    encoding: "utf8",
  },
);
const out = (doc.stdout || "") + (doc.stderr || "");
check("doctor exit 0", doc.status === 0, `status=${doc.status}`);
check("doctor shows kev", /kev System One/i.test(out));
check("doctor adj ready", /adj ready\s+pass/i.test(out));

console.log("\n" + "=".repeat(40));
if (failures.length) {
  console.log(`VALIDATION FAILED (${failures.length}): ${failures.join(", ")}`);
  process.exit(1);
}
console.log("VALIDATION PASSED — all checks green");
process.exit(0);
