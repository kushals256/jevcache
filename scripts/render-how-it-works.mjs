import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const items = [
  {
    html: path.join(root, "docs/how-it-works.html"),
    png: [path.join(root, "docs/how-it-works.png")],
    w: 1200,
    h: 680,
  },
  {
    html: path.join(root, "docs/propose-admit.html"),
    png: [
      path.join(root, "docs/propose-admit.png"),
      path.join(root, "docs/launch-video-kit/stills/generated/propose-admit.png"),
    ],
    w: 1200,
    h: 520,
  },
  {
    html: path.join(root, "docs/split-final-vs-tools.html"),
    png: [
      path.join(root, "docs/split-final-vs-tools.png"),
      path.join(root, "docs/launch-video-kit/stills/generated/split-final-vs-tools.png"),
    ],
    w: 1200,
    h: 520,
  },
  {
    html: path.join(root, "docs/terminal-demo.html"),
    png: [path.join(root, "docs/terminal-demo.png")],
    w: 1200,
    h: 520,
  },
  {
    html: path.join(root, "docs/benchmark-card.html"),
    png: [path.join(root, "docs/benchmark-card.png")],
    w: 1200,
    h: 620,
  },
  {
    html: path.join(root, "docs/architecture-arch.html"),
    png: [path.join(root, "docs/architecture-arch.png")],
    w: 1200,
    h: 620,
  },
];

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  for (const item of items) {
    const page = await browser.newPage({
      viewport: { width: item.w, height: item.h },
      deviceScaleFactor: 2, // 2x Retina resolution
    });

    await page.goto(`file://${item.html}`, { waitUntil: "networkidle" });
    for (const outPath of item.png) {
      await page.screenshot({ path: outPath, type: "png" });
      console.log(`Rendered ${path.basename(outPath)} successfully!`);
    }
    await page.close();
  }

  await browser.close();
  console.log("All renders completed successfully!");
}

main().catch(console.error);
