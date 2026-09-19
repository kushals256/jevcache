# jevcache

[![npm](https://img.shields.io/npm/v/@kushalicious/jevcache.svg)](https://www.npmjs.com/package/@kushalicious/jevcache)
[![npm downloads](https://img.shields.io/npm/dm/@kushalicious/jevcache.svg)](https://www.npmjs.com/package/@kushalicious/jevcache)
[![Docker](https://img.shields.io/badge/ghcr.io-kushals256%2Fjevcache-blue)](https://github.com/kushals256/jevcache/pkgs/container/jevcache)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Routers pick a model. jevcache decides whether to call one.**

A local OpenAI-compatible proxy. When your app asks the **same question in different words**, [TypeSafe Jev](https://typesafe.ai) can reuse the cached answer — so you skip another expensive chat call.

Not cosine similarity. Calibrated **same-intent** admits. If Jev errors, it **fails open** and still calls the model.

```
call 1  "Explain mutexes simply please"     →  MISS   ~3.2s   (calls the model, stores answer)
call 2  "Please explain mutexes simply"     →  HIT    ~0.4s   (jev · same answer · saved $)
```

Works with one script, one agent, or many — anything that speaks `/v1/chat/completions`.

---

## Try it in 30 seconds

```bash
npx @kushalicious/jevcache@latest start --demo
```

You’ll get a key prompt (OpenRouter), wiring snippets, a live **MISS → HIT**, and green HIT lines in the terminal.

| | |
| --- | --- |
| **Proxy** | `http://127.0.0.1:8080/v1` |
| **Stats** | [http://127.0.0.1:8080/stats](http://127.0.0.1:8080/stats) · or `npx @kushalicious/jevcache open` |
| **npm** | [`@kushalicious/jevcache`](https://www.npmjs.com/package/@kushalicious/jevcache) |
| **Docker** | `ghcr.io/kushals256/jevcache:latest` |

**Need an [OpenRouter](https://openrouter.ai/keys) key** for real Jev same-intent hits (and usually for chat).  
**No key?** still try the flow:

```bash
MOCK_JEV=1 MOCK_UPSTREAM=1 npx @kushalicious/jevcache@latest start --demo
```

---

## Wire your app (one line change)

Point your OpenAI-compatible client at the proxy — same SDK, different `baseURL`:

```js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "http://127.0.0.1:8080/v1", // ← was OpenAI / OpenRouter directly
});

await client.chat.completions.create({
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "Explain mutexes" }],
});
```

Also works with env overrides many tools already honor:

```bash
export OPENAI_BASE_URL="http://127.0.0.1:8080/v1"
export OPENAI_API_KEY="$OPENROUTER_API_KEY"
```

See [`examples/openai_sdk.mjs`](./examples/openai_sdk.mjs).

---

## Paste into Cursor / your coding agent

Don’t want to touch the terminal? Open a **new agent chat** and paste [`AGENT_SETUP.md`](./AGENT_SETUP.md).

The agent installs jevcache, asks once for your OpenRouter key, starts the proxy, and points your project at `http://127.0.0.1:8080/v1`.

<details>
<summary>Click to expand the full prompt</summary>

```text
You are setting up jevcache for me in this project.

Goal: run an OpenAI-compatible local proxy that caches chat completions when TypeSafe Jev judges "same intent", so repeated/paraphrased LLM calls cost less while I build.

Repo: https://github.com/kushals256/jevcache
npm: npx @kushalicious/jevcache@latest

Do ALL of the following without asking me to run terminal commands myself (you run them):

1. Check Node.js >= 20. If missing, tell me how to install it in one step for my OS.
2. Prefer the easiest install that works:
   a) Try: npx --yes @kushalicious/jevcache@latest doctor
      (fallback: npx --yes github:kushals256/jevcache doctor)
   b) If native build fails, use Docker with ghcr.io/kushals256/jevcache:latest on port 8080
   c) Or clone into ../jevcache, npm install, npm run build.
3. Ask me ONCE for an OpenRouter API key (https://openrouter.ai/keys) if OPENROUTER_API_KEY is not set. Save to .env (never commit; ensure .gitignore has .env).
4. Start jevcache in the background on http://127.0.0.1:8080 and verify GET /healthz.
5. Wire THIS app so OpenAI-compatible clients use baseURL "http://127.0.0.1:8080/v1" and my OpenRouter/upstream key.
6. Add SETUP_JEVCACHE.md (or a README note) with start command, baseURL, and /stats link.
7. Optionally add .cursor/rules/jevcache.mdc so future agents keep that baseURL.
8. Show a minimal paraphrase test and how to read X-Jevcache HIT/MISS or /stats.

Do not commit secrets. If install fails, try the next method (npx → docker → clone).

When done, tell me: start command, baseURL, where the key is stored, stats URL.
```

</details>

---

## How it works

```text
request → policy (bypass stream/tools/…)
       → exact SHA cache?
       → recent candidates + Jev same_intent?
       → HIT  → return cached answer
       → MISS → call upstream → store → return
```

1. **Policy** — bypass stream / tools / multimodal / volatile asks  
2. **Exact** — SHA-256 of canonical request (per model + system prompt)  
3. **Candidates** — recent prompts in that namespace  
4. **Jev admit** — `same_intent` + pick best candidate  
5. **Miss** → upstream LLM → store  
6. **Fail open** — if Jev errors, still call upstream  

**Why is the first call always a MISS?** The cache is empty for that question — pay once, store the answer, then paraphrases can HIT.

Each `model` id has its own cache namespace.

---

## CLI

```bash
npx @kushalicious/jevcache init              # .env + copy-paste wiring
npx @kushalicious/jevcache doctor            # check keys
npx @kushalicious/jevcache doctor --live     # + probe /healthz, Jev, upstream
npx @kushalicious/jevcache start             # run proxy
npx @kushalicious/jevcache start --demo      # boot + live MISS → HIT
npx @kushalicious/jevcache open              # open /stats in the browser
npx @kushalicious/jevcache help
```

On a real terminal: **green HIT**, **dim MISS**. Ctrl+C prints a session summary (`N` requests · hits · ~$ saved).

| Env | Meaning |
| --- | --- |
| `JEVCACHE_DEMO=1` | Same as `--demo` |
| `JEVCACHE_QUIET=1` | Hide per-request lines |
| `JEVCACHE_NO_COLOR=1` | Disable colors |

> First `npx` may compile `better-sqlite3` (needs basic build tools). Prefer Docker if that fails.

### Docker

```bash
docker run --rm -p 8080:8080 \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  -e UPSTREAM_API_KEY=$OPENROUTER_API_KEY \
  ghcr.io/kushals256/jevcache:latest
```

Or: `docker compose up` (see [`docker-compose.yml`](./docker-compose.yml)).

---

## FAQ

**Do I need OpenRouter?**  
For **Jev same-intent** hits: yes (Jev’s Decisions API is on OpenRouter).  
For **exact-only** caching: use any OpenAI-compatible upstream (`UPSTREAM_BASE_URL` + `UPSTREAM_API_KEY`).  
For a **keyless demo**: `MOCK_JEV=1 MOCK_UPSTREAM=1`.

**Does it only work for multi-agent setups?**  
No. Any app that repeats or rephrases chat calls benefits. Multi-agent just tends to hit more often.

**Is my key in this repo?**  
No. Use a local `.env` (gitignored). Never commit secrets.

**Where do prompts go?**  
Cache stays on disk under `DATA_DIR`. The semantic tier sends truncated, redacted prompt text to OpenRouter for Jev. See [`SECURITY.md`](./SECURITY.md).

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

See [`results/eval.json`](./results/eval.json) — live Jev had **0 false positives** on 100 fixtures vs a high Jaccard FP rate.

## Not in v0

Streaming cache HITs, tool-call caching, hosted multi-tenant SaaS, auto model routing.

## Links

- [Changelog](./CHANGELOG.md)
- [Security](./SECURITY.md)
- [npm package](https://www.npmjs.com/package/@kushalicious/jevcache)
- [Release notes](https://github.com/kushals256/jevcache/releases)

## License

MIT
