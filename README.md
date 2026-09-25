# jevcache

[![npm](https://img.shields.io/npm/v/@kushalicious/jevcache.svg)](https://www.npmjs.com/package/@kushalicious/jevcache)
[![npm downloads](https://img.shields.io/npm/dm/@kushalicious/jevcache.svg)](https://www.npmjs.com/package/@kushalicious/jevcache)
[![Docker](https://img.shields.io/badge/ghcr.io-kushals256%2Fjevcache-blue)](https://github.com/kushals256/jevcache/pkgs/container/jevcache)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Routers pick a model. jevcache decides whether to call one.**

A local OpenAI-compatible **chat response cache**: when your app asks the **same question in different words**, [TypeSafe Jev](https://typesafe.ai) can reuse the cached answer — so you skip another expensive chat call.

Not cosine similarity. Calibrated **same-intent** admits. If Jev errors, it **fails open** and still calls the model. Same intent is only reused while **freshness** allows — stale “latest” refuses (see `/stats` `freshness_rejects` and `X-Jevcache-Reason`).

<p align="center">
  <img src="docs/demo.gif" alt="Demo: start → MISS → HIT → /stats" width="720" />
</p>

```
call 1  "Explain mutexes simply please"     →  MISS   ~3.2s   (calls the model, stores answer)
call 2  "Please explain mutexes simply"     →  HIT    ~0.4s   (jev · same answer · saved $)
```

**Verified on a real app:** MISS `3244ms` → HIT (`jev`, intent `0.93`) `394ms`, same cached reply, est. saved `$0.000137`.

**Want to try it in your project?** → [paste the agent prompt](#easiest-path-paste-into-cursor-or-any-coding-agent) into a new Cursor chat (or run `npx` below).

Works with one script, one agent, or many — anything that speaks `/v1/chat/completions`.  
**No native SQLite compile** — uses Node’s built-in `node:sqlite` (Node ≥ 22.5).

---

## Principles

- **Drop-in proxy** — change `baseURL`; no SDK required.
- **Precision-first** — prefer miss over a wrong HIT. Judge success by false-HIT rate, not raw hit rate.
- **Fail-open** — adjudicator errors never invent answers; upstream still runs.
- **Time in the loop** — same intent ≠ forever valid.
- **Jev by default** — omit `ADJUDICATOR` for cloud Jev; set `ADJUDICATOR=kev|laya` only when a local System One server is running.

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
3. Ask me ONCE for an OpenRouter API key (https://openrouter.ai/keys) if OPENROUTER_API_KEY is not set. Save to .env (never commit; ensure .gitignore has .env).
4. Run: npx @kushalicious/jevcache init  (writes OPENAI_BASE_URL into .env)
5. Start jevcache in the background on http://127.0.0.1:8080 and verify GET /healthz.
6. Wire THIS app so OpenAI-compatible clients use baseURL "http://127.0.0.1:8080/v1".
7. Add SETUP_JEVCACHE.md with start command, baseURL, and /stats link.
8. Optionally add .cursor/rules/jevcache.mdc so future agents keep that baseURL.
9. Prove it: paraphrased prompts → expect MISS then HIT. Show X-Jevcache headers or /stats.

Do not commit secrets. If install fails, try the next method (npx → docker → clone).

When done, tell me: start command, baseURL, key location, whether MISS → HIT passed, stats URL.
```

You’ll need an [OpenRouter](https://openrouter.ai/keys) key when the agent asks (for real Jev hits). Prefer this path if you’re already in Cursor / Claude Code / Windsurf.

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

**No OpenRouter key?** still try the flow:

```bash
MOCK_JEV=1 MOCK_UPSTREAM=1 npx @kushalicious/jevcache@latest start --demo
```

Without a key, the proxy runs in **exact-only mode** (paraphrases miss; identical prompts can hit). You’ll see a clear banner on start.

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
For **Jev same-intent** hits: yes. For **exact-only**: any OpenAI-compatible upstream. For a **keyless demo**: `MOCK_JEV=1 MOCK_UPSTREAM=1`.

**Multi-agent only?** No — any repeating/paraphrasing chat client benefits.

**Stale answers / freshness?**  
Precision-first classes: `live` (bypass), `short` (~15m), `stable` (`TTL_SECONDS`, default 24h), `durable` (same as stable unless `TTL_DURABLE_SECONDS`). Exact + Jev paths enforce hard age; older candidates also get a same-call `reuse_fresh` check (`admit-v2`). Refuses show on `/stats` (`freshness_rejects`) and often `X-Jevcache-Reason: freshness_stale` on the following MISS. Demos stay safe: `reuse_fresh` only if age ≥ 5m (`FRESHNESS_JEV_MIN_AGE_MS`). Rollback: `FRESHNESS_MODE=off`.

**Native build tools?** No longer required for SQLite (Node built-in). Requires **Node ≥ 22.5**.

**Secrets in this repo?** No. Local `.env` only (gitignored).

**Privacy:** Cache on disk under `DATA_DIR`. Semantic tier sends truncated, redacted text to the adjudicator (OpenRouter Decisions for Jev, or your local System One URL). See [`SECURITY.md`](./SECURITY.md).

---

## Advanced: adjudicator backends

Happy path: **omit** `ADJUDICATOR` — default is **Jev** via OpenRouter Decisions (same as before).

| Value | Status |
| --- | --- |
| `jev` (default) | TypeSafe Jev via OpenRouter Decisions (`OPENROUTER_API_KEY` required) |
| `mock` | Synthetic same-intent (`MOCK_JEV=1` also selects this) |
| `kev` | Local System One — default `http://127.0.0.1:8008`, model `kev-latest` |
| `laya` | Local System One — default `http://127.0.0.1:8000`, model `laya-latest` |
| `laya-mlx` | Like `laya`; optional `LAYA_MLX_URL` / `LAYA_MLX_MODEL` |
| `systemone` / `local` | Generic System One — **requires** `ADJUDICATOR_URL` + `ADJUDICATOR_MODEL` |

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

**FAQ:** There is **no official local Jev** binary for Mac/desktop in this product path. Local = Kev/Laya/System One. Do not set `ADJUDICATOR=jev` and point `ADJUDICATOR_URL` at a System One host — kind selects the client.

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
