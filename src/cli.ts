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

function printHelp(): void {
  console.log(`jevcache — skip expensive chat calls when Jev says same intent

Usage:
  jevcache              Start the proxy (default)
  jevcache start        Same as above
  jevcache init         Create .env in the current folder
  jevcache doctor       Check keys / port
  jevcache help         Show this help

One-liners:
  npx jevcache@latest
  docker run --rm -p 8080:8080 \\
    -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \\
    -e UPSTREAM_API_KEY=$OPENROUTER_API_KEY \\
    ghcr.io/kushals256/jevcache:latest

Then point your SDK:
  baseURL: "http://127.0.0.1:8080/v1"
`);
}

async function cmdInit(): Promise<void> {
  const dest = path.join(process.cwd(), ".env");
  if (fs.existsSync(dest)) {
    console.log(`.env already exists at ${dest}`);
    return;
  }
  const example = path.join(ROOT, ".env.example");
  const template = fs.existsSync(example)
    ? fs.readFileSync(example, "utf8")
    : `OPENROUTER_API_KEY=\nUPSTREAM_API_KEY=\nUPSTREAM_BASE_URL=https://openrouter.ai/api/v1\nHOST=127.0.0.1\nPORT=8080\nDATA_DIR=./data\n`;
  fs.writeFileSync(dest, template);
  console.log(`Wrote ${dest}`);
  console.log("Add your OpenRouter key, then run: npx jevcache");
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

  const { app, close } = createApp(cfg);
  serve({ fetch: app.fetch, port: cfg.port, hostname: cfg.host }, () => {
    const base = `http://${cfg.host}:${cfg.port}`;
    console.log("");
    console.log("  jevcache is running");
    console.log(`  Proxy   ${base}/v1`);
    console.log(`  Stats   ${base}/stats`);
    console.log("");
    console.log("  In your app:");
    console.log(`    baseURL: "${base}/v1"`);
    console.log(`    apiKey:  your upstream / OpenRouter key`);
    console.log("");
    console.log("  Example:");
    console.log(`    import OpenAI from "openai";`);
    console.log(`    const client = new OpenAI({`);
    console.log(`      apiKey: process.env.OPENROUTER_API_KEY,`);
    console.log(`      baseURL: "${base}/v1",`);
    console.log(`    });`);
    console.log("");
    if (!cfg.openrouterApiKey && !cfg.mockJev) {
      console.log("  Note: no OPENROUTER_API_KEY → exact-cache only (no Jev semantic)");
    }
    if (cfg.mockJev) console.log("  MOCK_JEV=1");
    if (cfg.mockUpstream) console.log("  MOCK_UPSTREAM=1");
  });

  const shutdown = () => {
    console.log("\nshutting down…");
    close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

const raw = process.argv[2];
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
