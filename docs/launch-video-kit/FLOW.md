# FLOW — mute hook (15s) + master (~35s)

Motion rules: see [MOTION.md](MOTION.md). Claims: [CLAIMS.md](CLAIMS.md). Captions: [SCRIPT.md](SCRIPT.md).

Master **35.0s @ 30fps** (or 60fps). Hook = **0.00–15.00**. Brand: ink `#08101f` · hit `#6ba3ff` · bone `#eef3fb` · amber `#f0a45c`.

## Timeline

| Time | Beat | Peak move | Visual | On-screen | Asset |
|------|------|-----------|--------|-----------|-------|
| 0.00–0.40 | Void | hold | Ink/black void, faint top glow, mark ghost | — | `brand/logo-mark-black.png` |
| 0.40–2.20 | Brand draw | spark stroke-draw → fill | Hit-blue spark traces MorrowCache mark | — | `brand/logo-mark-*.png` |
| 2.20–3.40 | Thesis lock | invert-pill wipe | “Same **intent**. Skip the call.” pill slides on *intent* | Same · intent · Skip the call. | `stills/generated/pill-intent.png` |
| 3.40–7.00 | Paraphrase reel | vertical noun reel | Slot cycles paraphrases; anchor “Same intent.” holds | paraphrase lines (see SCRIPT) | type-only / TraceTheater still |
| 7.00–10.20 | Money shot | odometer + accent | MISS 2817ms → HIT 423ms · 6.7× · intent 0.94; hit-blue on × | 2817 → 423 · 6.7× | `latency-*.png` |
| 10.20–15.00 | Proxy expands | glass bar → expand | Struck `api.openai.com` → `127.0.0.1:8080/v1`; HIT panel unfolds | Change baseURL. Keep your model. | `baseurl-bar.png` + footage |
| **15.00** | **HOOK END** | freeze | Hold expanded HIT / 423ms frame | — | export freeze |
| 15.00–19.50 | Precision | feature board + scan | Jaccard FPR 0.49 row highlighted vs Morrow clean admit | Word overlap lies. | `jaccard-scan.png` |
| 19.50–24.00 | Trust | path spark / refuse flash | Freshness REFUSE → fail-open | Stale “latest”? REFUSE | `pill-refuse.png` / `badge-refuse.png` |
| 24.00–29.00 | Install | type lock on beat | Install command plate; optional VHS inset | npx cmd | `install-cmd.png` + `footage/demo-vhs.mp4` |
| 29.00–35.00 | Lockup | quiet settle | Pixel/wordmark + thesis + site | Routers… / call one | `end-card.png` / `thesis.png` |

## Hook export (0–15s)

1. Cut master at 15.00 on the expanded HIT / latency freeze.
2. Also export 1:1 center crop for X alternate (`footage/demo-launch-hook-1x1.mp4` is the previous cut — replace when re-rendering).
3. Poster / thumbnail: latency miss or HIT freeze (`stills/demo-launch-poster.png` until replaced).

## Existing footage roles

| File | Role in this cut |
|------|------------------|
| `footage/demo-launch-story.mp4` | Prior desk-metaphor master — **reference only**; do not treat as peak grammar |
| `footage/demo-launch-hook.mp4` | Prior 15s hook — same |
| `footage/demo-vhs.mp4` | Real CLI proof inset for install beat |
| `refs/peak-ref.mp4` | Motion target — watch before every edit session |

## Assembly notes

- Prefer CapCut / Premiere / HyperFrames with GSAP locked to the table above.
- Score: optional synth; quiet open then ~100 BPM; no VO.
- When HyperFrames `hf-launch` is re-authored, retarget `DIRECTION.md` / `timing.json` cues to this table (desk whip cuts out).
