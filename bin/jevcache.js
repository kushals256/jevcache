#!/usr/bin/env node
/** Re-exec with --experimental-sqlite so node:sqlite works without native addons. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "..", "dist", "cli.js");
const flag = "--experimental-sqlite";

if (!process.execArgv.includes(flag)) {
  const result = spawnSync(process.execPath, [flag, cli, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

await import("../dist/cli.js");
