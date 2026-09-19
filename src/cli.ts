#!/usr/bin/env node
/** SPDX-License-Identifier: MIT */
import { serve } from "@hono/node-server";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { createApp } from "./server.js";
import { loadPriceOverlay } from "./prices.js";

const cfg = loadConfig();
const overlayPath = path.join(process.cwd(), "prices.local.json");
if (fs.existsSync(overlayPath)) {
  loadPriceOverlay(fs.readFileSync(overlayPath, "utf8"));
}

if (cfg.host !== "127.0.0.1" && cfg.host !== "localhost" && !cfg.adminToken) {
  console.warn(
    "[jevcache] HOST is non-loopback without JEVCACHE_ADMIN_TOKEN — /stats and admin are locked; set a token.",
  );
}

const { app, close } = createApp(cfg);
serve({ fetch: app.fetch, port: cfg.port, hostname: cfg.host }, () => {
  console.log(`jevcache listening on http://${cfg.host}:${cfg.port}`);
  console.log(`  /v1/chat/completions  /stats  /healthz`);
  if (!cfg.openrouterApiKey && !cfg.mockJev) console.log("  OPENROUTER_API_KEY unset → exact-cache only (no Jev semantic)");
  if (cfg.mockJev) console.log("  MOCK_JEV=1");
  if (cfg.mockUpstream) console.log("  MOCK_UPSTREAM=1");
});

function shutdown() {
  console.log("shutting down…");
  close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
