#!/usr/bin/env node
/** SPDX-License-Identifier: MIT */
import { serve } from "@hono/node-server";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createApp } from "./server.js";
import { loadPriceOverlay } from "./prices.js";
import {
  createAdjudicator,
  resolveAdjudicatorKind,
  adjudicatorReady,
  adjudicatorBanner,
  isSystemOneKind,
} from "./adjudicator/index.js";
import type { Config } from "./config.js";
import { forwardModels } from "./upstream.js";
import { summarize, type Stats } from "./stats.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const useColor = process.stdout.isTTY && process.env.NO_COLOR !== "1" && process.env.JEVCACHE_NO_COLOR !== "1";
const c = {
  reset: useColor ? "\x1b[0m" : "",
  green: useColor ? "\x1b[32m" : "",
  dim: useColor ? "\x1b[2m" : "",
  bold: useColor ? "\x1b[1m" : "",
  yellow: useColor ? "\x1b[33m" : "",
  red: useColor ? "\x1b[31m" : "",
};

function loadDotEnv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || process.env[k] === "") process.env[k] = v;
  }
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).some((a) => a === name || a === `--${name}`);
}

function printHelp(): void {
  console.log(`MorrowCache (jevcache) — skip expensive chat calls when same intent is admitted

Usage:
  jevcache              Start the proxy (default)
  jevcache start        Same as above
  jevcache start --demo After boot, run a live MISS → HIT demo
  jevcache init         Create/update .env + OPENAI_BASE_URL wiring
  jevcache doctor       Check keys / Node
  jevcache doctor --live  Also probe /healthz, adjudicator, and upstream
  jevcache status       Is the proxy up? hit rate / $ saved
  jevcache open         Open /stats in your browser
  jevcache help         Show this help

One-liners:
  npx @kushalicious/jevcache@latest
  docker run --rm -p 8080:8080 \\
    -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \\
    -e UPSTREAM_API_KEY=$OPENROUTER_API_KEY \\
    ghcr.io/kushals256/jevcache:latest

Then point your SDK:
  baseURL: "http://127.0.0.1:8080/v1"

Env:
  JEVCACHE_DEMO=1       Same as --demo
  JEVCACHE_QUIET=1      Hide per-HIT / MISS console lines
  JEVCACHE_NO_COLOR=1   Disable TTY colors
`);
}

function upsertEnvVars(filePath: string, vars: Record<string, string>): { created: boolean; updated: string[] } {
  const created = !fs.existsSync(filePath);
  let text = created ? "" : fs.readFileSync(filePath, "utf8");
  if (!text.endsWith("\n") && text.length) text += "\n";
  const updated: string[] = [];
  for (const [key, value] of Object.entries(vars)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(text)) {
      text = text.replace(re, `${key}=${value}`);
      updated.push(key);
    } else {
      text += `${key}=${value}\n`;
      updated.push(key);
    }
  }
  fs.writeFileSync(filePath, text);
  return { created, updated };
}

async function cmdInit(): Promise<void> {
  const dest = path.join(process.cwd(), ".env");
  const port = process.env.PORT || "8080";
  const host = process.env.HOST || "127.0.0.1";
  const base = `http://${host}:${port}`;
  const example = path.join(ROOT, ".env.example");
  if (!fs.existsSync(dest) && fs.existsSync(example)) {
    fs.writeFileSync(dest, fs.readFileSync(example, "utf8"));
    console.log(`Wrote ${dest} from .env.example`);
  }
  const { created, updated } = upsertEnvVars(dest, {
    OPENAI_BASE_URL: `${base}/v1`,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "",
    HOST: host,
    PORT: port,
    DATA_DIR: process.env.DATA_DIR || "./data",
    UPSTREAM_BASE_URL: process.env.UPSTREAM_BASE_URL || "https://openrouter.ai/api/v1",
  });
  if (created) console.log(`Created ${dest}`);
  else console.log(`Updated ${dest}: ${updated.join(", ")}`);
  console.log(`  OPENAI_BASE_URL=${base}/v1  ← point your app here`);
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.log("  Add OPENROUTER_API_KEY=… for Jev same-intent hits (exact-only without it).");
  }
  printWireSnippets(base);
  console.log("  Next: npx @kushalicious/jevcache start --demo");
  console.log("");
}

function printWireSnippets(base = "http://127.0.0.1:8080"): void {
  const v1 = `${base}/v1`;
  console.log("");
  console.log("  Wire your app (pick one):");
  console.log("");
  console.log("  # OpenAI SDK");
  console.log(`  import OpenAI from "openai";`);
  console.log(`  const client = new OpenAI({`);
  console.log(`    apiKey: process.env.OPENROUTER_API_KEY,`);
  console.log(`    baseURL: "${v1}",`);
  console.log(`  });`);
  console.log("");
  console.log("  # Env override (many tools honor these)");
  console.log(`  export OPENAI_BASE_URL="${v1}"`);
  console.log(`  export OPENAI_API_KEY="$OPENROUTER_API_KEY"`);
  console.log("");
  console.log("  # LangChain (ChatOpenAI)");
  console.log(`  new ChatOpenAI({`);
  console.log(`    model: "openai/gpt-4o-mini",`);
  console.log(`    configuration: { baseURL: "${v1}" },`);
  console.log(`    apiKey: process.env.OPENROUTER_API_KEY,`);
  console.log(`  });`);
  console.log("");
  console.log(`  Stats: ${base}/stats`);
  console.log("");
}

function printModeBanner(cfg: Config): void {
  const kind = resolveAdjudicatorKind(cfg);
  const ready = adjudicatorReady(cfg);
  console.log(`  ${c.dim}Adj${c.reset}     ${adjudicatorBanner(cfg)}`);
  if (kind === "mock" || cfg.mockJev) {
    console.log(`  ${c.yellow}Mode${c.reset}    MOCK adjudicator — synthetic same-intent (dev only)`);
    return;
  }
  if (ready && isSystemOneKind(kind)) {
    console.log(`  ${c.green}Mode${c.reset}    ${kind} System One + exact cache`);
    return;
  }
  if (ready && kind === "jev") {
    console.log(`  ${c.green}Mode${c.reset}    Jev same-intent + exact cache`);
    return;
  }
  console.log("");
  console.log(`  ${c.yellow}╔══════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`  ${c.yellow}║  EXACT-ONLY MODE — adjudicator not ready                 ║${c.reset}`);
  console.log(`  ${c.yellow}║  Paraphrases will MISS. Exact same prompt can HIT.       ║${c.reset}`);
  if (kind === "jev" || kind === "unknown") {
    console.log(`  ${c.yellow}║  Set OPENROUTER_API_KEY for Jev, or ADJUDICATOR=kev/laya ║${c.reset}`);
  } else {
    console.log(`  ${c.yellow}║  Set ADJUDICATOR_URL + ADJUDICATOR_MODEL for ${kind.padEnd(12)}║${c.reset}`);
  }
  console.log(`  ${c.yellow}╚══════════════════════════════════════════════════════════╝${c.reset}`);
  console.log("");
}

async function cmdStatus(): Promise<void> {
  loadDotEnv(path.join(process.cwd(), ".env"));
  const cfg = loadConfig();
  const base = `http://${cfg.host}:${cfg.port}`;
  console.log("MorrowCache status");
  try {
    const health = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(2500) });
    if (!health.ok) {
      console.log(`  running   ${mark(false)}  ${base} → HTTP ${health.status}`);
      console.log(`  ${c.dim}→ start with: jevcache start${c.reset}`);
      process.exitCode = 1;
      return;
    }
    console.log(`  running   ${mark(true)}  ${base}`);
  } catch {
    console.log(`  running   ${mark(false)}  not reachable at ${base}`);
    console.log(`  ${c.dim}→ start with: jevcache start${c.reset}`);
    process.exitCode = 1;
    return;
  }

  const headers: Record<string, string> = {};
  if (cfg.adminToken) headers["X-Jevcache-Admin"] = cfg.adminToken;
  try {
    const res = await fetch(`${base}/stats.json`, {
      headers,
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.log(`  stats     ${mark(false)}  HTTP ${res.status}`);
      process.exitCode = 1;
      return;
    }
    const s = (await res.json()) as {
      requests: number;
      hits_exact: number;
      hits_jev: number;
      misses: number;
      hit_rate: number;
      net_saved_usd: number;
    };
    const hits = (s.hits_exact || 0) + (s.hits_jev || 0);
    console.log(`  requests  ${s.requests ?? 0}`);
    console.log(`  hits      ${hits}  (exact ${s.hits_exact ?? 0} · intent ${s.hits_jev ?? 0})`);
    console.log(`  misses    ${s.misses ?? 0}`);
    console.log(`  hit rate  ${((s.hit_rate ?? 0) * 100).toFixed(1)}%`);
    console.log(`  saved     ~${formatUsd(s.net_saved_usd ?? 0)} (est. net)`);
    console.log(`  stats UI  ${base}/stats`);
  } catch (e) {
    console.log(`  stats     ${mark(false)}  ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}

async function ensureKeysInteractive(): Promise<void> {
  loadDotEnv(path.join(process.cwd(), ".env"));
  const cfgPeek = loadConfig();
  // Local System One ready → no OpenRouter key required for semantic admit
  if (adjudicatorReady(cfgPeek) && isSystemOneKind(resolveAdjudicatorKind(cfgPeek))) {
    return;
  }
  if (process.env.OPENROUTER_API_KEY?.trim() || process.env.MOCK_JEV === "1") return;
  if (!process.stdin.isTTY) {
    console.warn(
      "[jevcache] No OPENROUTER_API_KEY — exact-cache only (or set ADJUDICATOR=kev|laya).",
    );
    return;
  }
  const rl = readline.createInterface({ input, output });
  try {
    console.log("No OPENROUTER_API_KEY found.");
    console.log("Get one at https://openrouter.ai/keys (used for Jev + optional upstream chat).");
    console.log("Or set ADJUDICATOR=kev|laya for a local System One backend.");
    const key = (await rl.question("Paste OpenRouter API key (or Enter to skip): ")).trim();
    if (!key) {
      console.warn("");
      console.warn(`${c.yellow}[jevcache] Skipping OpenRouter key → EXACT-ONLY MODE (unless local adj)${c.reset}`);
      console.warn(`${c.yellow}[jevcache] Paraphrases will MISS until Jev key or ADJUDICATOR=kev|laya.${c.reset}`);
      console.warn("");
      return;
    }
    process.env.OPENROUTER_API_KEY = key;
    if (!process.env.UPSTREAM_API_KEY?.trim()) process.env.UPSTREAM_API_KEY = key;
    const save = (await rl.question("Save to ./.env for next time? [Y/n] ")).trim().toLowerCase();
    if (save === "" || save === "y" || save === "yes") {
      const dest = path.join(process.cwd(), ".env");
      const lines = [
        `OPENROUTER_API_KEY=${key}`,
        `UPSTREAM_API_KEY=${process.env.UPSTREAM_API_KEY}`,
        `UPSTREAM_BASE_URL=${process.env.UPSTREAM_BASE_URL || "https://openrouter.ai/api/v1"}`,
        `HOST=${process.env.HOST || "127.0.0.1"}`,
        `PORT=${process.env.PORT || "8080"}`,
        `DATA_DIR=${process.env.DATA_DIR || "./data"}`,
        "",
      ];
      fs.writeFileSync(dest, lines.join("\n"));
      console.log(`Saved ${dest} (keep this private — do not commit)`);
    }
  } finally {
    rl.close();
  }
}

function mark(ok: boolean): string {
  if (ok) return `${c.green}pass${c.reset}`;
  return `${c.red}fail${c.reset}`;
}

async function doctor(): Promise<void> {
  loadDotEnv(path.join(process.cwd(), ".env"));
  const cfg = loadConfig();
  const kind = resolveAdjudicatorKind(cfg);
  const ready = adjudicatorReady(cfg);
  const hasOr = !!cfg.openrouterApiKey || cfg.mockJev;
  const hasUp = !!cfg.upstreamApiKey || hasOr || cfg.mockUpstream;
  const live = hasFlag("live");

  console.log("MorrowCache doctor");
  console.log(`  adjudicator         ${adjudicatorBanner(cfg)}`);
  console.log(
    `  adj ready           ${ready ? mark(true) : mark(false) + (kind === "jev" ? " (need OPENROUTER_API_KEY)" : "")}`,
  );
  if (kind === "jev") {
    console.log(`  OPENROUTER_API_KEY  ${hasOr ? mark(true) : mark(false) + " (needed for Jev)"}`);
  } else if (isSystemOneKind(kind)) {
    console.log(`  OPENROUTER_API_KEY  ${hasOr ? mark(true) : c.dim + "optional for adj" + c.reset}`);
  }
  console.log(`  UPSTREAM_API_KEY    ${hasUp ? mark(true) : mark(false) + " (needed for chat)"}`);
  console.log(`  cwd                 ${process.cwd()}`);
  console.log(`  Node                ${process.version}`);

  const proxyEnv = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY;
  if (proxyEnv && isSystemOneKind(kind)) {
    console.log(
      `  ${c.yellow}tip${c.reset}                 HTTP(S)_PROXY is set — may hijack fetch to 127.0.0.1; unset for local adj`,
    );
  }
  if (kind === "jev" && /systemone/i.test(cfg.adjudicatorUrl || "")) {
    console.log(
      `  ${c.yellow}warn${c.reset}                ADJUDICATOR_URL looks like System One but kind=jev (Decisions client)`,
    );
  }

  if (!live) {
    if (!ready && kind === "jev") console.log("\nRun: jevcache init   then edit .env");
    else printWireSnippets(`http://${cfg.host}:${cfg.port}`);
    console.log("  Tip: jevcache doctor --live  → probe /healthz, adjudicator, upstream");
    console.log("");
    return;
  }

  console.log("");
  console.log("  live probes");
  const base = `http://${cfg.host}:${cfg.port}`;

  // /healthz
  try {
    const res = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(3000) });
    const ok = res.ok;
    let extra = "";
    if (ok) {
      try {
        const body = (await res.json()) as {
          adjudicator?: { name?: string; kind?: string; ready?: boolean };
        };
        if (body.adjudicator) {
          extra = `  kind=${body.adjudicator.kind} ready=${body.adjudicator.ready}`;
        }
      } catch {
        /* ignore */
      }
    }
    console.log(`  /healthz            ${mark(ok)}  ${base}/healthz${ok ? extra : ` (${res.status})`}`);
    if (!ok) console.log(`  ${c.dim}→ start the proxy: jevcache start${c.reset}`);
  } catch {
    console.log(`  /healthz            ${mark(false)}  not reachable at ${base}`);
    console.log(`  ${c.dim}→ start the proxy: jevcache start${c.reset}`);
  }

  // Adjudicator probe via factory
  const adjLabel = isSystemOneKind(kind) ? kind : kind === "mock" ? "mock" : "Jev";
  if (!ready) {
    console.log(`  ${adjLabel.padEnd(19)} ${mark(false)}  adjudicator not ready`);
  } else {
    try {
      const adj = createAdjudicator(cfg);
      const admit = await adj.admit({
        newText: "Explain mutexes simply please",
        candidates: [
          { id: "a", text: "Please explain mutexes simply" },
          { id: "b", text: "How does DNS work?" },
        ],
        threshold: cfg.intentThreshold,
        maxStateChars: cfg.maxStateChars,
        timeoutMs: Math.min(cfg.jevTimeoutMs, 20_000),
      });
      if (admit.ok) {
        console.log(
          `  ${adjLabel.padEnd(19)} ${mark(true)}  noul=${admit.noul.toFixed(2)} best=${admit.best}`,
        );
      } else {
        console.log(`  ${adjLabel.padEnd(19)} ${mark(false)}  ${admit.error.slice(0, 80)}`);
      }
    } catch (e) {
      console.log(
        `  ${adjLabel.padEnd(19)} ${mark(false)}  ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Upstream probe
  const upKey = cfg.upstreamApiKey || cfg.openrouterApiKey;
  if (cfg.mockUpstream) {
    console.log(`  upstream            ${mark(true)}  MOCK_UPSTREAM=1`);
  } else if (!upKey) {
    console.log(`  upstream            ${mark(false)}  no UPSTREAM_API_KEY`);
  } else {
    try {
      const up = await forwardModels({
        baseUrl: cfg.upstreamBaseUrl,
        apiKey: upKey,
        timeoutMs: Math.min(cfg.upstreamTimeoutMs, 15_000),
      });
      if (up.ok) {
        console.log(`  upstream            ${mark(true)}  ${cfg.upstreamBaseUrl}/models`);
      } else {
        console.log(`  upstream            ${mark(false)}  HTTP ${up.status}`);
      }
    } catch (e) {
      console.log(`  upstream            ${mark(false)}  ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log("");
  printWireSnippets(base);
}

function openStats(): void {
  loadDotEnv(path.join(process.cwd(), ".env"));
  const cfg = loadConfig();
  const url = `http://${cfg.host}:${cfg.port}/stats`;
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.unref();
    console.log(`Opening ${url}`);
  } catch (e) {
    console.error(`Could not open browser: ${e instanceof Error ? e.message : String(e)}`);
    console.error(`Open manually: ${url}`);
    process.exit(1);
  }
}

function formatUsd(n: number): string {
  if (n >= 0.01) return `$${n.toFixed(2)}`;
  if (n >= 0.0001) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function printSessionSummary(stats: Stats, base: string): void {
  const s = summarize(stats);
  const hits = s.hits_exact + s.hits_jev;
  console.log("");
  console.log(
    `${c.bold}  Session${c.reset}  ${s.requests} requests · ${hits} hits · ~${formatUsd(s.net_saved_usd)} saved · ${base}/stats`,
  );
  console.log("");
}

async function askDemo(): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input, output });
  try {
    const a = (
      await rl.question("Run a live demo (2 chat calls: MISS then HIT)? [y/N] ")
    )
      .trim()
      .toLowerCase();
    return a === "y" || a === "yes";
  } finally {
    rl.close();
  }
}

async function runLiveDemo(base: string, apiKey: string): Promise<void> {
  const model = process.env.DEMO_MODEL || "openai/gpt-4o-mini";
  const prompts = [
    "Explain mutexes simply please",
    "Please explain mutexes simply",
  ];
  console.log("");
  console.log("  Live demo — two paraphrases (expect MISS, then HIT)…");
  console.log(`  model: ${model}`);

  for (const content of prompts) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          seed: 42,
          messages: [{ role: "user", content }],
        }),
      });
      const cache = res.headers.get("X-Jevcache") ?? "?";
      const tier = res.headers.get("X-Jevcache-Tier") ?? "";
      const saved = res.headers.get("X-Jevcache-Saved-USD");
      const ms = Date.now() - t0;
      const label = tier && tier !== "none" ? `${cache} (${tier})` : cache;
      const savedBit = saved && Number(saved) > 0 ? ` · saved ~${formatUsd(Number(saved))}` : "";
      if (!res.ok) {
        const body = await res.text();
        console.log(`  ${label}  ${res.status}  ${content}  (${ms}ms)`);
        console.log(`    ${body.slice(0, 160)}`);
      } else {
        console.log(`  ${label}${savedBit}  "${content}"  (${ms}ms)`);
      }
    } catch (e) {
      console.log(`  error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`  Done. Open ${base}/stats  (or: jevcache open)`);
  console.log("");
}

async function startServer(): Promise<void> {
  loadDotEnv(path.join(process.cwd(), ".env"));
  await ensureKeysInteractive();

  const overlayPath = path.join(process.cwd(), "prices.local.json");
  if (fs.existsSync(overlayPath)) {
    loadPriceOverlay(fs.readFileSync(overlayPath, "utf8"));
  }

  const cfg = loadConfig();
  if (cfg.host !== "127.0.0.1" && cfg.host !== "localhost" && !cfg.adminToken) {
    console.warn(
      "[jevcache] HOST is non-loopback without JEVCACHE_ADMIN_TOKEN — /stats and admin are locked; set a token.",
    );
  }

  const quiet = process.env.JEVCACHE_QUIET === "1";
  let announcedFirstHit = false;
  const base = `http://${cfg.host}:${cfg.port}`;

  const { app, close, stats } = createApp(cfg, {
    onHit: quiet
      ? undefined
      : (ev) => {
          const line = `${c.green}[jevcache] HIT (${ev.tier})${c.reset} · saved ~${formatUsd(ev.savedUsd)} · total saved ${formatUsd(ev.totalSavedUsd)} · ${ev.preview}`;
          console.log(line);
          if (!announcedFirstHit) {
            announcedFirstHit = true;
            console.log(
              `${c.green}[jevcache] First hit — you're saving calls.${c.reset} Stats: ${base}/stats`,
            );
          }
        },
    onMiss: quiet
      ? undefined
      : (ev) => {
          console.log(
            `${c.dim}[jevcache] MISS · spent ~${formatUsd(ev.spentUsd)} · ${ev.preview}${c.reset}`,
          );
        },
  });

  const forceDemo = hasFlag("demo") || process.env.JEVCACHE_DEMO === "1";

  await new Promise<void>((resolve) => {
    serve({ fetch: app.fetch, port: cfg.port, hostname: cfg.host }, () => {
      console.log("");
      console.log("  MorrowCache is running");
      console.log(`  Proxy   ${base}/v1`);
      console.log(`  Stats   ${base}/stats`);
      printModeBanner(cfg);
      printWireSnippets(base);
      if (!quiet) {
        console.log("  Hits/misses print here (colors on TTY).");
        console.log("  Set JEVCACHE_QUIET=1 to hide them.");
        console.log("");
      }
      if (cfg.mockUpstream) console.log("  MOCK_UPSTREAM=1");
      if (!forceDemo) {
        console.log("  Tip: jevcache start --demo  → live MISS then HIT");
        console.log("       jevcache status        → hit rate / $ saved");
        console.log("       jevcache open          → open /stats");
        console.log("");
      }
      resolve();
    });
  });

  const wantDemo = forceDemo ? true : await askDemo();
  if (wantDemo) {
    const key =
      cfg.upstreamApiKey ||
      cfg.openrouterApiKey ||
      process.env.UPSTREAM_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      "";
    if (!key && !cfg.mockUpstream) {
      console.warn("  Demo skipped — no upstream API key.");
    } else {
      await runLiveDemo(base, key || "mock");
    }
  }

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    printSessionSummary(stats, base);
    console.log("shutting down…");
    close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const raw = args[0];
const cmd = (raw || "start").toLowerCase();
if (cmd === "help" || cmd === "-h" || cmd === "--help") {
  printHelp();
} else if (cmd === "init") {
  await cmdInit();
} else if (cmd === "doctor") {
  await doctor();
} else if (cmd === "status") {
  await cmdStatus();
} else if (cmd === "open") {
  openStats();
} else if (cmd === "start" || raw === undefined) {
  await startServer();
} else {
  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}
