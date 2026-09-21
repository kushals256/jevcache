#!/usr/bin/env node
/**
 * Deterministic frame render of concept.html → docs/demo-launch.mp4
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const framesDir = path.join(__dirname, "_frames");
const outMp4 = path.join(root, "docs/demo-launch.mp4");
const outPoster = path.join(root, "docs/demo-poster.png");

const W = 1600;
const H = 900;
const FPS = 30;
const DURATION_S = 7.2;
const TOTAL = Math.round(DURATION_S * FPS);

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function serveStatic(dir) {
  const server = createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath === "/") urlPath = "/concept.html";
      const file = path.normalize(path.join(dir, urlPath.replace(/^\//, "")));
      if (!file.startsWith(dir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const data = await readFile(file);
      const ext = path.extname(file);
      const type =
        ext === ".html"
          ? "text/html; charset=utf-8"
          : "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("missing");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port };
}

async function main() {
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });

  const { server, port } = await serveStatic(__dirname);
  const url = `http://127.0.0.1:${port}/concept.html?play=0`;

  console.log("Launching Chrome…");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "1", {
    timeout: 15000,
  });

  console.log(`Capturing ${TOTAL} frames @ ${FPS}fps…`);
  for (let i = 0; i < TOTAL; i++) {
    const t = i / FPS;
    await page.evaluate((sec) => window.__seek(sec), t);
    await page.screenshot({
      path: path.join(framesDir, `frame-${String(i).padStart(4, "0")}.png`),
      type: "png",
    });
    if (i % 30 === 0) process.stdout.write(`  t=${t.toFixed(2)}s\n`);
  }

  // Punchline frame as poster (~6.0s)
  const posterIdx = Math.round(6.0 * FPS);
  await run("cp", [
    path.join(framesDir, `frame-${String(posterIdx).padStart(4, "0")}.png`),
    outPoster,
  ]);

  await browser.close();
  server.close();

  console.log("Encoding mp4…");
  await run("ffmpeg", [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    path.join(framesDir, "frame-%04d.png"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "17",
    "-preset",
    "slow",
    "-movflags",
    "+faststart",
    outMp4,
  ]);

  await rm(framesDir, { recursive: true, force: true });
  console.log(`OK ${outMp4} (${(statSync(outMp4).size / 1024).toFixed(0)} KB)`);
  console.log(`OK ${outPoster} (${(statSync(outPoster).size / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
