---
name: stats
description: Show how MorrowCache is doing for this project - hit rate, money saved, judge cost, hit and miss latency - and explain surprising hits or misses. Use when the user asks whether the LLM cache is working, what it saved, or why a request hit or missed.
allowed-tools: Read Bash(npx --yes @kushalicious/jevcache@latest status) Bash(curl -s http://127.0.0.1:*/stats.json) Bash(curl -s http://127.0.0.1:*/healthz)
---

# MorrowCache stats

Read the numbers from the running proxy and explain them in plain language.

1. Find the port: `PORT` in the project's `.env`, default 8080.
2. Run `npx --yes @kushalicious/jevcache@latest status` from the project root. If it says the proxy is
   not reachable, tell the user to start it with `npx @kushalicious/jevcache@latest start` (or run
   `/morrowcache:setup` if it was never set up) and stop.
3. Fetch `curl -s http://127.0.0.1:<port>/stats.json` for the detail. If it returns 401 or 403,
   the proxy has `JEVCACHE_ADMIN_TOKEN` set; ask the user to open `/stats` in a browser instead.

Report, briefly:
- Requests, hits (exact vs judged), misses, bypasses.
- `hit_rate_eligible`: hits divided by hits plus misses, ignoring bypassed requests. This is the
  fair hit rate.
- `saved_usd` against `jev_spend_usd` (judge cost) and `net_saved_usd`. If `cost_inversion_warning`
  is true, the judge cost more than it saved: say so, and suggest a local judge (`ADJUDICATOR=kev`
  or `laya`) or exact-only for this traffic.
- Typical latency: median hit vs median miss.
- `freshness_rejects` and `jev_errors` if non-zero, with what they mean: time-sensitive questions
  were refused on purpose; judge errors fall back to the model.

Explaining a single request (when the user asks why something hit or missed): read its response
headers.
- `X-Jevcache`: HIT, MISS or BYPASS.
- `X-Jevcache-Tier`: `exact`, `jev`, `turn_exact` or `turn_jev` (agent turn cache).
- `X-Jevcache-Reason`: why it missed or bypassed, for example `tool_calls` (responses with tool
  calls are never stored), `freshness_stale`, `freshness_live`, `high_temperature` (above 0.3 is
  exact-only), `tool_choice_forced`, `logprobs`, `audio`.

A wrong hit is possible. If the user reports one, suggest sending `X-Jevcache-Bypass: 1` for that
call, deleting `./data` for a cold cache, and opening an issue at
https://github.com/kushals256/jevcache/issues with the two prompts.

Never print API keys or `.env` values other than `PORT`.
