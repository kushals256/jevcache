/** Offline admit-rule + optional live Jev eval. Cosine baseline uses naive token Jaccard. */
import fs from "node:fs";
import path from "node:path";
import { admitSameIntent } from "../src/jev_admit.js";

type Row = { id: string; label: "same" | "different"; a: string; b: string };

function jaccard(a: string, b: string): number {
  const A = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const B = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter || 1;
  return inter / union;
}

function loadRows(): Row[] {
  const p = path.join(process.cwd(), "fixtures/intent_pairs.jsonl");
  return fs
    .readFileSync(p, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as Row);
}

function metrics(pred: boolean[], labels: boolean[]) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < pred.length; i++) {
    if (pred[i] && labels[i]) tp++;
    else if (pred[i] && !labels[i]) fp++;
    else if (!pred[i] && !labels[i]) tn++;
    else fn++;
  }
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  const f1 = (2 * precision * recall) / (precision + recall || 1);
  return { tp, fp, tn, fn, precision, recall, f1, false_positive_rate: fp / (fp + tn || 1) };
}

async function main() {
  const rows = loadRows();
  const labels = rows.map((r) => r.label === "same");

  // Cosine-like baseline: Jaccard >= 0.35 as "same"
  const cosPred = rows.map((r) => jaccard(r.a, r.b) >= 0.35);
  const cos = metrics(cosPred, labels);

  const live = process.env.LIVE === "1" && !!process.env.OPENROUTER_API_KEY;
  let jev = null as ReturnType<typeof metrics> | null;
  let jevCost = 0;
  if (live) {
    const pred: boolean[] = [];
    for (const r of rows) {
      const res = await admitSameIntent({
        apiKey: process.env.OPENROUTER_API_KEY!,
        model: process.env.JEV_MODEL || "typesafe/jev-1.13",
        newText: r.a,
        candidates: [{ id: "a", text: r.b }],
        threshold: Number(process.env.INTENT_THRESHOLD || 0.85),
        maxStateChars: 8000,
        timeoutMs: 30000,
      });
      if (!res.ok) {
        pred.push(false);
        continue;
      }
      jevCost += res.costUsd;
      pred.push(res.admit && res.best === "a");
      await new Promise((r) => setTimeout(r, 50));
    }
    jev = metrics(pred, labels);
  }

  const out = {
    n: rows.length,
    cosine_jaccard_threshold_0_35: cos,
    jev_live: jev,
    jev_cost_usd: jevCost,
    note: live
      ? "Live Jev results"
      : "Set LIVE=1 OPENROUTER_API_KEY=... for Jev metrics; cosine baseline always runs",
  };
  fs.mkdirSync("results", { recursive: true });
  fs.writeFileSync("results/eval.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
