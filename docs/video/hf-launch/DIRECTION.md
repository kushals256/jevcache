# MorrowCache launch — direction

## Story (sourced)

- **What:** Local OpenAI-compatible proxy that skips the chat call when a same-intent adjudicator admits a paraphrase. (README)
- **How:** Exact hit → same-intent admit (Jev default / Kev / Laya / Laya MLX) → freshness refuse → fail-open. 2.0 stores final text only, including a later stream. Never replay tool_calls. (README)
- **Proof:** Recorded demo MISS 2817ms → HIT 423ms · intent 0.94 · ~6.7× (`docs/video/live-summary.json`). Offline Jaccard@0.35 FPR 0.49 n=103 (`results/eval.json`). Prefer miss over wrong hit.

## Visual concept

**The double-bill desk.** A night clerk’s station where every LLM call prints a paper charge slip. Paraphrases try to print a second bill. MorrowCache is the clerk’s stamp: SAME INTENT voids the duplicate before air freight (the model) flies. Freshness tickets get REFUSED. A lazy Jaccard stamp voids the wrong slip.

World: ink desk (#08101f), bone paper, hit-blue rubber stamp, amber refuse. Camera always moves — desk push-ins, stamp slam, receipt whip pans. Pixel wordmark only for MorrowCache lockups.

## Analogy map

| Mechanism | Desk prop |
| --- | --- |
| First completion (MISS) | Charge slip prints · clerk stamps CHARGE · model flies |
| Paraphrase | Second slip with different wording slides in |
| Same-intent admit | Blue SAME INTENT stamp punches · second slip voids |
| Latency payoff | Stamp ink bleeds into HIT · 423ms / 6.7× |
| Jaccard baseline | Wrong stamp voids “mergesort” as “quicksort” · FPR 0.49 |
| Drop-in proxy | Address plate: api.openai.com → 127.0.0.1:8080/v1 |
| Freshness refuse | “what’s the latest” slip · REFUSE · model still flies |
| Install | One command plate |

## Timing source

All cue times live in `timing.json`. Picture GSAP and `scripts/synth-score.py` both read it.

## Shot list (incl. 0.30s preroll)

| t | Shot | Camera | Proud moment |
| --- | --- | --- | --- |
| 0.00–0.30 | Preroll lock: MISS slip + MorrowCache pin | Static hold for X thumbnail | Product mid-job |
| 0.30–2.40 | Cold open: two charge slips slam | Whip down onto desk | Dual receipts land on kick |
| 2.40–4.80 | First slip CHARGE · latency bar fills 2817 | Punch-in on stamp | Stamp slam + paper dent |
| 4.80–7.20 | Second slip types paraphrase | Lateral track | Cursor types into bone paper |
| 7.20–10.80 | SAME INTENT stamp · void · HIT 423 / 6.7× | Slam + pull-back | Blue ink bloom + bar collapse |
| 10.80–14.40 | Jaccard wrong-stamp vs Morrow short race | Crash zoom on wrong void | Wrong ticket stamped, then correct void |
| 14.40–18.00 | Address plate rewrite baseURL | Match-cut plate slide | Struck-through URL → local |
| 18.00–21.60 | Freshness REFUSE | Stamp rotates amber | Slip rejected, gate opens fail-open |
| 21.60–26.40 | Install command + site | Slow push | Command locks on beat |
| 26.40–31.20 | End lockup thesis | Rise on pixel mark | “whether to *call* one” hit accent |

Duration: **31.5s** master. Hook cut: 0–15s.
