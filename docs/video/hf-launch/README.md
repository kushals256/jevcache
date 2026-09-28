# MorrowCache launch showreel

31.5s · 1920×1080 · 60fps · scored to a shared timing map.

## Commands

```bash
python3 scripts/synth-score.py   # rebuild assets/audio/score.wav from timing.json
npm run check
npm run render -- --fps 60 --quality high --output renders/morrowcache-launch.mp4
```

## Timing principle

Every cue lives in `timing.json`. The GSAP timeline in `index.html` and `scripts/synth-score.py` both read those numbers, so stamp slams and score hits land together.

## Metaphor

Double-bill desk: every LLM call prints a charge slip. Same-intent stamp voids the paraphrase. Freshness stamps REFUSE. Claims stay exact.

## Claims disclosure

- Recorded demo: MISS `2817ms` → HIT `423ms` · intent `0.94` · ~`6.7×` (`docs/video/live-summary.json`)
- Offline Jaccard@0.35 FPR `0.49` · n=103 (`results/eval.json`)
- Prefer miss over wrong hit · fail-open · streaming/tools bypass

## Audio

Score checked by measurement (integrated ≈ −12.5 LUFS), not by ear. Regenerated from `timing.json`.

## Outputs

- `renders/morrowcache-launch.mp4` — master
- `renders/poster.jpg` — X thumbnail (~HIT void frame)
- Hook cut: trim `0–15s` of the master for short posts
