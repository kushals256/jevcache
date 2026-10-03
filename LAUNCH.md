## One-command for users

```bash
npx @kushalicious/jevcache@latest
npx @kushalicious/jevcache@latest start --demo
```

npm: https://www.npmjs.com/package/@kushalicious/jevcache  
Docker: `ghcr.io/kushals256/jevcache:latest`  
Site: https://morrowcache.vercel.app

# Launch checklist

## Pre-tweet uniqueness re-check
```bash
gh search repos "jevcache"
gh search code "same_intent" "chat/completions" jev --limit 20
```
If a clone appeared, sharpen README first sentence before posting.

## Video assets (mute — no audio)

Built from [`docs/video/hf-launch/`](docs/video/hf-launch/) (HyperFrames 0.8.78).

| File | Use |
|------|-----|
| [`docs/demo-launch-hook.mp4`](docs/demo-launch-hook.mp4) | **X post 1** — 15s 16:9 mute loop |
| [`docs/demo-launch-hook-1x1.mp4`](docs/demo-launch-hook-1x1.mp4) | X alternate square crop |
| [`docs/demo-launch-hook.gif`](docs/demo-launch-hook.gif) | Reddit / comments GIF |
| [`docs/demo-launch-story.mp4`](docs/demo-launch-story.mp4) | **X reply 2 / Reddit body** — 35s mute |
| [`docs/demo-launch-poster.png`](docs/demo-launch-poster.png) | Thumbnail (MISS · 2817ms frame) |
| [`docs/demo-launch.mp4`](docs/demo-launch.mp4) | Alias of hook for older links |
| [`docs/demo-vhs.gif`](docs/demo-vhs.gif) / [`docs/demo-vhs.mp4`](docs/demo-vhs.mp4) | Real CLI `--demo` capture (VHS); Reddit comment proof |

Re-render:
```bash
cd docs/video/hf-launch && npm run render -- -o ../../demo-launch-story.mp4 --fps 30 -q delivery
# then ffmpeg trim/crop/gif as in the launch video plan
```

## Other assets
1. Run `npx @kushalicious/jevcache@latest start --demo` → screenshot `/stats`
2. One false-HIT story: Jaccard would merge “explain quicksort” vs “explain mergesort”; Jev should not
3. `results/eval.json` from `npm run eval` (and optionally `LIVE=1`)

## X thread (mute video)

**Post 1** — hook MP4, no link:
> Same question. Different words. You still pay twice — unless the proxy admits same intent.

**Reply 2** — story MP4:
> How it works
> 1. Same-intent HIT (not cosine) — recorded 2817ms → 423ms @ intent 0.94 (~6.7×)
> 2. Drop-in OpenAI-compatible proxy — change baseURL, keep your model
> 3. Fail-open + freshness refuse when “latest” should not reuse

**Reply 3** — links:
> `npx @kushalicious/jevcache@latest`
> https://morrowcache.vercel.app
> https://github.com/kushals256/jevcache

Alt text for upload: `Same-intent cache: 2817ms miss → 423ms hit at intent 0.94. Drop-in OpenAI-compatible proxy.`

## Reddit draft

**Title:** Drop-in OpenAI-compatible proxy that skips the chat call when the paraphrase is the same intent (recorded 2817→423ms)

**Body:** Attach `demo-launch-story.mp4` or `demo-launch-hook.gif`. Mention fail-open, offline Jaccard FPR 0.49 honesty, and that 2.0 can hit on final text including a later stream. Never claim tool-call replay or guaranteed savings. Point `baseURL`, keep your model. Package `@kushalicious/jevcache`.

## Awesome Jev / jevlist one-liner
> `@kushalicious/jevcache` — local OpenAI proxy that skips chat completions when TypeSafe Jev (or local Kev/Laya System One) says same intent (fail-open, freshness-aware).

## Do not claim
- Guaranteed 0 false hits
- Unmeasured dollar amounts
- That local Kev/Laya accuracy matches cloud Jev (operator-tuned)
- “Works with every model / Anthropic-native / streaming cache”
