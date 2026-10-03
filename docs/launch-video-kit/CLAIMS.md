# CLAIMS — allowed / forbidden

Source of truth: repo `LAUNCH.md` + `docs/video/hf-launch/timing.json`.

## Allowed (show these numbers)

| Claim | Value | Context |
|-------|-------|---------|
| Miss latency | **2817ms** | Recorded demo first completion |
| Hit latency | **423ms** | Recorded same-intent HIT |
| Speedup | **~6.7×** | 2817 / 423 |
| Intent score | **0.94** | Recorded admit |
| Jaccard FPR | **0.49** | Offline @0.35, n=103 — honesty, not a flex to hide |
| Package | `@kushalicious/jevcache@latest` | npm |
| Port / baseURL | `127.0.0.1:8080/v1` | Local proxy |
| Site | morrowcache.vercel.app | |

## Product truths (okay to say)

- Local OpenAI-compatible proxy that skips the chat call when same-intent admits a paraphrase
- Drop-in: change baseURL, keep your model
- Fail-open when unsure
- Freshness refuse when “latest” should not reuse
- 2.0 can HIT on final text, including a later stream of that answer. `tool_calls` are never stored or replayed. `TURN_CACHE=off` restores the old stream/tools bypass.
- Prefer miss over wrong hit

## Do not claim

- Guaranteed 0 false hits  
- Unmeasured dollar amounts / “save $X”  
- That local Kev/Laya accuracy matches cloud Jev (operator-tuned)  
- “Works with every model” / Anthropic-native / replaying tool calls  
- Any number not in the allowed table above  

## Thesis line (end card)

> Routers pick a model. This decides whether to call one.
