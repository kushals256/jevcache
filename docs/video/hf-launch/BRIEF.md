# MorrowCache X/Reddit Launch Video

workflow: product-launch-video
flow: primary
VO_MODE: none

## Intent

Sell MorrowCache for X/Twitter + Reddit. Mute-only. Product-is-the-demo (TraceTheater), not a site tour.

## USP hierarchy

1. Same-intent skip (MISS 2817ms → HIT 423ms · 6.7× · intent 0.94) — not cosine
2. Drop-in OpenAI-compatible proxy — change baseURL, keep your model
3. Precision-first — fail-open, freshness refuse, show Jaccard FPR 0.49 loss
4. One command — npx @kushalicious/jevcache@latest

## Thesis

Routers pick a model. This proxy decides whether to call one.

## Cuts

- Hook: 0–15s (export also 1:1 center crop)
- Story: 0–35s

## Audio

Synthesized score locked to `timing.json` (see `scripts/synth-score.py`). No VO. Orientation headers only — show, don't tell.

## Direction

See `DIRECTION.md`. Metaphor: double-bill desk / receipt clerk.

## Brand

ink #08101f · hit #6ba3ff · bone #eef3fb · amber #f0a45c
Geist Pixel for MorrowCache lockups only. Geist Sans / Mono for UI.

## Inspiration notes

- Cursor 2.0: hard cuts, product UI hero, punch-in numbers
- Railway: terminal type credibility, precise linear easing on state
- MATI: PROBLEM → DEMO → CTA compressed; refuse/FPR only in story cut

## Honest numbers only

2817 / 423 / 6.7× / 0.94 / FPR 0.49 / fail-open
Do not claim Anthropic-native support, tool-call replay, or guaranteed savings. A streaming hit is allowed only for stored final text.
