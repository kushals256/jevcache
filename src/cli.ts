#!/usr/bin/env node
/** SPDX-License-Identifier: MIT */
import { serve } from "@hono/node-server";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createApp } from "./server.js";
import { loadPriceOverlay } from "./prices.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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
  console.log(`jevcache — skip expensive chat calls when Jev says same intent

Usage:
  jevcache              Start the proxy (default)
  jevcache start        Same as above
  jevcache start --demo After boot, run a live MISS → HIT demo
  jevcache init         Create .env + print copy-paste wiring
  jevcache doctor       Check keys / port
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
  JEVCACHE_QUIET=1      Hide per-HIT console lines
`);
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

async function cmdInit(): Promise<void> {
  const dest = path.join(process.cwd(), ".env");
  if (fs.existsSync(dest)) {
    console.log(`.env already exists at ${dest}`);
  } else {
    const example = path.join(ROOT, ".env.example");
    const template = fs.existsSync(example)
      ? fs.readFileSync(example, "utf8")
      : `OPENROUTER_API_KEY=\nUPSTREAM_API_KEY=\nUPSTREAM_BASE_URL=https://openrouter.ai/api/v1\nHOST=127.0.0.1\nPORT=8080\nDATA_DIR=./data\n`;
    fs.writeFileSync(dest, template);
    console.log(`Wrote ${dest}`);
    console.log("Add your OpenRouter key, then run: npx @kushalicious/jevcache");
  }
  printWireSnippets();
  console.log("  Next: npx @kushalicious/jevcache start --demo");
  console.log("");
}

async function ensureKeysInteractive(): Promise<void> {
  if (process.env.OPENROUTER_API_KEY?.trim() || process.env.MOCK_JEV === "1") return;
  if (!process.stdin.isTTY) {
    console.warn(
      "[jevcache] No OPENROUTER_API_KEY — exact-cache only. Set it for Jev same-intent hits.",
    );
    return;
  }
  const rl = readline.createInterface({ input, output });
  try {
    console.log("No OPENROUTER_API_KEY found.");
    console.log("Get one at https://openrouter.ai/keys (used for Jev + optional upstream chat).");
    const key = (await rl.question("Paste OpenRouter API key (or Enter to skip): ")).trim();
    if (!key) {
      console.warn("Skipping — exact-cache only until you set OPENROUTER_API_KEY.");
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

function doctor(): void {
  loadDotEnv(path.join(process.cwd(), ".env"));
  const hasOr = !!process.env.OPENROUTER_API_KEY?.trim();
  const hasUp = !!process.env.UPSTREAM_API_KEY?.trim() || hasOr;
  console.log("jevcache doctor");
  console.log(`  OPENROUTER_API_KEY  ${hasOr ? "ok" : "MISSING (needed for Jev)"}`);
  console.log(`  UPSTREAM_API_KEY    ${hasUp ? "ok" : "MISSING (needed for chat)"}`);
  console.log(`  cwd                 ${process.cwd()}`);
  console.log(`  Node                ${process.version}`);
  if (!hasOr) console.log("\nRun: jevcache init   then edit .env");
  else printWireSnippets();
}

function formatUsd(n: number): string {
  if (n >= 0.01) return `$${n.toFixed(2)}`;
  if (n >= 0.0001) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
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
  console.log(`  Done. Open ${base}/stats`);
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

  const { app, close } = createApp(cfg, {
    onHit: quiet
      ? undefined
      : (ev) => {
          const line = `[jevcache] HIT (${ev.tier}) · saved ~${formatUsd(ev.savedUsd)} · total saved ${formatUsd(ev.totalSavedUsd)} · ${ev.preview}`;
          console.log(line);
          if (!announcedFirstHit) {
            announcedFirstHit = true;
            console.log(`[jevcache] First hit — you're saving calls. Stats: http://${cfg.host}:${cfg.port}/stats`);
          }
        },
  });

  const forceDemo = hasFlag("demo") || process.env.JEVCACHE_DEMO === "1";

  await new Promise<void>((resolve) => {
    serve({ fetch: app.fetch, port: cfg.port, hostname: cfg.host }, () => {
      const base = `http://${cfg.host}:${cfg.port}`;
      console.log("");
      console.log("  jevcache is running");
      console.log(`  Proxy   ${base}/v1`);
      console.log(`  Stats   ${base}/stats`);
      printWireSnippets(base);
      if (!quiet) {
        console.log("  Hits print here as HIT (exact|jev) · saved · total.");
        console.log("  Set JEVCACHE_QUIET=1 to hide them.");
        console.log("");
      }
      if (!cfg.openrouterApiKey && !cfg.mockJev) {
        console.log("  Note: no OPENROUTER_API_KEY → exact-cache only (no Jev semantic)");
      }
      if (cfg.mockJev) console.log("  MOCK_JEV=1");
      if (cfg.mockUpstream) console.log("  MOCK_UPSTREAM=1");
      if (!forceDemo) {
        console.log("  Tip: jevcache start --demo  → live MISS then HIT");
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
      const base = `http://${cfg.host}:${cfg.port}`;
      await runLiveDemo(base, key || "mock");
    }
  }

  const shutdown = () => {
    console.log("\nshutting down…");
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
  doctor();
} else if (cmd === "start" || raw === undefined) {
  await startServer();
} else {
  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}
