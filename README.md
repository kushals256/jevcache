# MorrowCache

[![npm](https://img.shields.io/npm/v/@kushalicious/jevcache.svg)](https://www.npmjs.com/package/@kushalicious/jevcache)
[![npm downloads](https://img.shields.io/npm/dm/@kushalicious/jevcache.svg)](https://www.npmjs.com/package/@kushalicious/jevcache)
[![Docker](https://img.shields.io/badge/ghcr.io-kushals256%2Fjevcache-blue)](https://github.com/kushals256/jevcache/pkgs/container/jevcache)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**MorrowCache** — routers pick a model. This proxy decides whether to call one.

npm package and CLI stay `@kushalicious/jevcache` / `jevcache` (download history unchanged). Site: [morrowcache.vercel.app](https://morrowcache.vercel.app).

A local OpenAI-compatible **chat response cache**: when your app asks the **same question in different words**, a **same-intent adjudicator** can reuse the cached answer — so you skip another expensive chat call.

**Default:** cloud [TypeSafe Jev](https://typesafe.ai) via OpenRouter.  
**Also works locally:** point the same proxy at **Kev**, **Laya**, **Laya MLX**, or any **System One**-compatible server on your machine — no OpenRouter key required for admits.

Not cosine similarity. Calibrated **same-intent** admits. If the adjudicator errors, it **fails open** and still calls the model. Same intent is only reused while **freshness** allows — stale “latest” refuses (see `/stats` `freshness_rejects` and `X-Jevcache-Reason`).

<p align="center">
  <img src="docs/demo.gif" alt="Demo: start → MISS → HIT → /stats" width="720" />
</p>

```
call 1  "Explain mutexes simply please"     →  MISS   ~3.2s   (calls the model, stores answer)
call 2  "Please explain mutexes simply"     →  HIT    ~0.4s   (same intent · same answer · saved $)
```

**Verified on a real app:** MISS `3244ms` → HIT (`jev`, intent `0.93`) `394ms`, same cached reply, est. saved `$0.000137`.

**Want to try it in your project?** → [paste the agent prompt](#easiest-path-paste-into-cursor-or-any-coding-agent) into a new Cursor chat (or run `npx` below).

Works with one script, one agent, or many — anything that speaks `/v1/chat/completions`.  
**No native SQLite compile** — uses Node’s built-in `node:sqlite` (Node ≥ 22.5).

---

## Adjudicators: cloud Jev or local System One

| Mode | Env | Needs OpenRouter for admit? |
| --- | --- | --- |
| **Jev** (default) | omit `ADJUDICATOR` | Yes — `OPENROUTER_API_KEY` |
| **Kev** (local) | `ADJUDICATOR=kev` | No — default `http://127.0.0.1:8008` |
| **Laya** (local) | `ADJUDICATOR=laya` | No — default `http://127.0.0.1:8000` |
| **Laya MLX** | `ADJUDICATOR=laya-mlx` | No |
| **Any System One** | `ADJUDICATOR=systemone` + URL + model | No (unless your server requires a key) |

```bash
# Local Kev — semantic hits without OpenRouter
ADJUDICATOR=kev npx @kushalicious/jevcache@latest start

# Local Laya
ADJUDICATOR=laya npx @kushalicious/jevcache@latest start
```

Upstream chat still needs a real model API key (or `MOCK_UPSTREAM=1` for a keyless demo). Details: [Advanced: adjudicator backends](#advanced-adjudicator-backends).

---

## Principles

- **Drop-in proxy** — change `baseURL`; no SDK required.
- **Precision-first** — prefer miss over a wrong HIT. Judge success by false-HIT rate, not raw hit rate.
- **Fail-open** — adjudicator errors never invent answers; upstream still runs.
- **Time in the loop** — same intent ≠ forever valid.
- **Jev by default, local opt-in** — cloud Jev out of the box; `ADJUDICATOR=kev|laya|…` for on-machine System One. MorrowCache is the product name; the npm package remains `@kushalicious/jevcache`.

### Claims we do **not** make (yet)

- “Proven better than every cosine cache”
- “Zero false positives”
- Unmeasured dollar savings as a guarantee

See [`results/eval.json`](./results/eval.json). **Published honest number:** on a live Jev run (n=100), false-positive rate was **0.00** vs Jaccard@0.35 baseline **~0.48** — precision-first, not a forever guarantee. Offline suite now has 103 pairs including negation/entity traps; re-run with `LIVE=1` to refresh.

### When **not** to use

- Personalized / secret questions (“what’s my balance”)
- Live tool-calling / side-effecting agents (bypassed when `tools` present)
- Multi-tenant cloud without `X-Jevcache-Tenant` (and understand local SQLite retains answers)
- Expecting streaming cache HITs (stream is bypass in v0)

---

## Easiest path: paste into Cursor (or any coding agent)

**Open a new agent chat → copy the whole block below → send.**  
The agent installs jevcache, wires `OPENAI_BASE_URL`, and proves **MISS → HIT**. Same prompt lives in [`AGENT_SETUP.md`](./AGENT_SETUP.md).

```text
You are setting up jevcache for me in this project.

Goal: run an OpenAI-compatible local proxy that caches chat completions when TypeSafe Jev judges "same intent", so repeated/paraphrased LLM calls cost less while I build.

Repo: https://github.com/kushals256/jevcache
npm: npx @kushalicious/jevcache@latest

Do ALL of the following without asking me to run terminal commands myself (you run them):

1. Check Node.js >= 22.5. If missing, tell me how to install it in one step for my OS.
2. Prefer the easiest install that works:
   a) Try: npx --yes @kushalicious/jevcache@latest doctor
      (fallback: npx --yes github:kushals256/jevcache doctor)
   b) If that fails, use Docker with ghcr.io/kushals256/jevcache:latest on port 8080
   c) Or clone into ../jevcache, npm install, npm run build.
3. Ask me ONCE for an OpenRouter API key (https://openrouter.ai/keys) if OPENROUTER_API_KEY is not set AND I am not using a local adjudicator. If I want local Kev/Laya instead, set ADJUDICATOR=kev (or laya) and skip the OpenRouter key for admits. Save keys to .env (never commit; ensure .gitignore has .env).
4. Run: npx @kushalicious/jevcache init  (writes OPENAI_BASE_URL into .env)
5. Start jevcache in the background on http://127.0.0.1:8080 and verify GET /healthz.
6. Wire THIS app so OpenAI-compatible clients use baseURL "http://127.0.0.1:8080/v1".
7. Add SETUP_JEVCACHE.md with start command, baseURL, and /stats link.
8. Optionally add .cursor/rules/jevcache.mdc so future agents keep that baseURL.
9. Prove it: paraphrased prompts → expect MISS then HIT. Show X-Jevcache headers or /stats.

Do not commit secrets. If install fails, try the next method (npx → docker → clone).

When done, tell me: start command, baseURL, key location, whether MISS → HIT passed, stats URL.
```

You’ll need an [OpenRouter](https://openrouter.ai/keys) key when the agent asks **if you want cloud Jev**. For local Kev/Laya instead, tell the agent to set `ADJUDICATOR=kev` (or `laya`) and skip the OpenRouter prompt for admits. Prefer this path if you’re already in Cursor / Claude Code / Windsurf.

---

## Or try it yourself in 30 seconds

```bash
npx @kushalicious/jevcache@latest start --demo
```

You’ll get a key prompt, wiring snippets (`OPENAI_BASE_URL` in `.env`), a live **MISS → HIT**, and green HIT lines in the terminal.

| | |
| --- | --- |
| **Proxy** | `http://127.0.0.1:8080/v1` |
| **Stats** | [http://127.0.0.1:8080/stats](http://127.0.0.1:8080/stats) · `jevcache open` / `jevcache status` |
| **npm** | [`@kushalicious/jevcache`](https://www.npmjs.com/package/@kushalicious/jevcache) |
| **Docker** | `ghcr.io/kushals256/jevcache:latest` |
| **Agent setup** | [`AGENT_SETUP.md`](./AGENT_SETUP.md) ← paste into a new chat |

**No OpenRouter key?** You still have options:

```bash
# A) Local System One (Kev/Laya) — real semantic admits on localhost
ADJUDICATOR=kev MOCK_UPSTREAM=1 npx @kushalicious/jevcache@latest start --demo

# B) Synthetic demo (no real adjudicator)
MOCK_JEV=1 MOCK_UPSTREAM=1 npx @kushalicious/jevcache@latest start --demo
```

With neither a Jev key nor a local adjudicator, the proxy runs in **exact-only mode** (paraphrases miss; identical prompts can hit). You’ll see a clear banner on start.

---

## Wire your app (one line change)

```bash
npx @kushalicious/jevcache init   # writes OPENAI_BASE_URL=http://127.0.0.1:8080/v1 into ./.env
```

Or set it yourself:

```js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "http://127.0.0.1:8080/v1", // ← was OpenAI / OpenRouter directly
});
```

```bash
export OPENAI_BASE_URL="http://127.0.0.1:8080/v1"
export OPENAI_API_KEY="$OPENROUTER_API_KEY"
```

See [`examples/openai_sdk.mjs`](./examples/openai_sdk.mjs).

---

## How it works

```text
request → policy (bypass stream/tools/…)
       → exact SHA cache?
       → recent candidates + IntentAdjudicator (default: Jev)?
       → HIT  → return cached answer
       → MISS → call upstream → store → return
```

**Why is the first call always a MISS?** The cache is empty for that question — pay once, store the answer, then paraphrases can HIT.

---

## CLI

```bash
npx @kushalicious/jevcache init              # .env + OPENAI_BASE_URL
npx @kushalicious/jevcache doctor            # check keys
npx @kushalicious/jevcache doctor --live     # + /healthz, Jev, upstream
npx @kushalicious/jevcache start             # run proxy
npx @kushalicious/jevcache start --demo      # live MISS → HIT
npx @kushalicious/jevcache status            # running? hit rate / $ saved
npx @kushalicious/jevcache open              # open /stats
npx @kushalicious/jevcache help
```

On a TTY: **green HIT**, **dim MISS**. Ctrl+C prints a session summary.

| Env | Meaning |
| --- | --- |
| `JEVCACHE_DEMO=1` | Same as `--demo` |
| `JEVCACHE_QUIET=1` | Hide per-request lines |
| `JEVCACHE_NO_COLOR=1` | Disable colors |

### Docker

**One replica / one volume** — SQLite is single-process; do not scale compose replicas against the same DB file.

```bash
docker run --rm -p 8080:8080 \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  -e UPSTREAM_API_KEY=$OPENROUTER_API_KEY \
  ghcr.io/kushals256/jevcache:latest
```

Or: `docker compose up` (single service).

---

## FAQ

**Do I need OpenRouter?**  
For **default cloud Jev** admits: yes (`OPENROUTER_API_KEY`). For **local Kev/Laya/System One**: no OpenRouter key for admits — run your local server and set `ADJUDICATOR=kev|laya|…`. Upstream chat still needs a model API key (or `MOCK_UPSTREAM=1`). For a **fully keyless synthetic demo**: `MOCK_JEV=1 MOCK_UPSTREAM=1`.

**Does it work fully offline / on my laptop?**  
Yes for the **adjudicator** path: Kev, Laya, Laya MLX, or any System One HTTP server on `127.0.0.1`. The proxy itself always runs locally. Upstream generation is whatever you configure (`UPSTREAM_BASE_URL`) — OpenRouter, another cloud API, or mock.

**Multi-agent only?** No — any repeating/paraphrasing chat client benefits.

**Stale answers / freshness?**  
Precision-first classes: `live` (bypass), `short` (~15m), `stable` (`TTL_SECONDS`, default 24h), `durable` (same as stable unless `TTL_DURABLE_SECONDS`). Exact + Jev paths enforce hard age; older candidates also get a same-call `reuse_fresh` check (`admit-v2`). Refuses show on `/stats` (`freshness_rejects`) and often `X-Jevcache-Reason: freshness_stale` on the following MISS. Demos stay safe: `reuse_fresh` only if age ≥ 5m (`FRESHNESS_JEV_MIN_AGE_MS`). Rollback: `FRESHNESS_MODE=off`.

**Native build tools?** No longer required for SQLite (Node built-in). Requires **Node ≥ 22.5**.

**Secrets in this repo?** No. Local `.env` only (gitignored).

**Privacy:** Cache on disk under `DATA_DIR`. Semantic tier sends truncated, redacted text to the adjudicator (OpenRouter Decisions for Jev, or your local System One URL). See [`SECURITY.md`](./SECURITY.md).

---

## Advanced: adjudicator backends

Same story as [Adjudicators: cloud Jev or local System One](#adjudicators-cloud-jev-or-local-system-one) — defaults and env knobs in one place.

Happy path: **omit** `ADJUDICATOR` — default is **Jev** via OpenRouter Decisions.

| Value | What it does |
| --- | --- |
| `jev` (default) | TypeSafe Jev via OpenRouter Decisions (`OPENROUTER_API_KEY` required) |
| `mock` | Synthetic same-intent (`MOCK_JEV=1` also selects this) |
| `kev` | **Local** System One — default `http://127.0.0.1:8008`, model `kev-latest` |
| `laya` | **Local** System One — default `http://127.0.0.1:8000`, model `laya-latest` |
| `laya-mlx` | Like `laya`; optional `LAYA_MLX_URL` / `LAYA_MLX_MODEL` |
| `systemone` / `local` | Any System One host — **requires** `ADJUDICATOR_URL` + `ADJUDICATOR_MODEL` |

Works with **any System One–compatible model** you run (Kev, Laya, custom). There is no official local Jev binary in this path — local = System One.

**Local example (Kev):**

```bash
# Start your Kev / System One server on :8008, then:
ADJUDICATOR=kev MOCK_UPSTREAM=1 jevcache start
# OpenRouter key not required for admit; still needed for real upstream chat unless MOCK_UPSTREAM.
```

Optional env:

- `ADJUDICATOR_URL` — for `jev`: Decisions URL override (`JEV_DECISIONS_URL` alias). For System One kinds: base URL (normalized to `…/v1/systemone`).
- `ADJUDICATOR_MODEL` — model id for System One kinds (defaults for kev/laya).
- `ADJUDICATOR_API_KEY` — optional Bearer for System One (empty = no Auth header on localhost).
- `ADJUDICATOR_TIMEOUT_MS` — admit timeout (alias of `JEV_TIMEOUT_MS`).

Do not set `ADJUDICATOR=jev` and point `ADJUDICATOR_URL` at a System One host — **kind selects the client**.

**Ops tips:** Unset `HTTP_PROXY` / `HTTPS_PROXY` when using localhost adjudicators (Node `fetch` can be hijacked). Kev is often single-request — expect higher latency under parallel paraphrases; the proxy still **fail-opens** on timeout. Keep `CANDIDATE_K` small (default 5; soft-capped to 7 for System One choice).

`EMBEDDING_MODE` does **not** produce semantic HITs alone (only the adjudicator may admit).

Maintainers: add a backend under `src/adjudicator/`, register in `factory.ts`, document when `jevcache doctor --live` passes.

---

## From source

```bash
git clone https://github.com/kushals256/jevcache
cd jevcache && npm install && npm start
```

## Eval

```bash
npm run eval
LIVE=1 OPENROUTER_API_KEY=... npm run eval
```

See [`results/eval.json`](./results/eval.json). Offline Jaccard baseline always runs in CI. **Published honest number:** prior live Jev run (n=100) false-positive rate **0.00** vs Jaccard@0.35 **~0.48** — not a forever guarantee; refresh with `LIVE=1`.

## Not in v0

Streaming cache HITs, tool-call caching, hosted multi-tenant SaaS, auto model routing, bundling local model weights.

## Kill / park criteria

After disambiguation + one Jev-channel post: if there is no meaningful engagement (issues, installs interest, or agent paste usage), stay in maintenance mode — no speculative backend farming.

## Links

- [Agent setup prompt](./AGENT_SETUP.md) · [Changelog](./CHANGELOG.md) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)
- [npm](https://www.npmjs.com/package/@kushalicious/jevcache) · [Releases](https://github.com/kushals256/jevcache/releases)

## License

MIT

<!-- Social preview: upload docs/og.png in GitHub Settings → General → Social preview -->
