# jevcache

[![npm](https://img.shields.io/npm/v/@kushalicious/jevcache.svg)](https://www.npmjs.com/package/@kushalicious/jevcache)
[![Docker](https://img.shields.io/badge/ghcr.io-kushals256%2Fjevcache-blue)](https://github.com/kushals256/jevcache/pkgs/container/jevcache)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Routers pick a model. jevcache decides whether to call one.**

Local OpenAI-compatible proxy that sits between your app and the LLM API. When someone asks the **same question in different words**, [TypeSafe Jev](https://typesafe.ai) can admit a cache hit — so you skip the expensive chat call. Calibrated same-intent decisions, not cosine similarity.

Works with one script, one agent, or many — anything that speaks OpenAI `chat/completions`.

## Why use it

While you build, apps and agents rephrase a lot (“explain X”, “what is X?”, retries). Each repeat normally costs another call. jevcache reuses the answer when Jev says **same intent**, and **fails open** (if Jev errors, it still calls the model).

## Quick start

```bash
npx @kushalicious/jevcache@latest
# optional live proof: MISS then HIT
npx @kushalicious/jevcache@latest start --demo
```

It asks for an [OpenRouter](https://openrouter.ai/keys) key if needed, prints copy-paste wiring, and logs hits like:

`HIT (jev) · saved ~$0.01 · total saved $0.12`

Point any OpenAI-compatible client at the proxy:

```js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "http://127.0.0.1:8080/v1", // ← jevcache
});

await client.chat.completions.create({
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "Explain mutexes" }],
});
```

| | |
|---|---|
| Proxy | `http://127.0.0.1:8080/v1` |
| Stats | [http://127.0.0.1:8080/stats](http://127.0.0.1:8080/stats) |
| npm | [`@kushalicious/jevcache`](https://www.npmjs.com/package/@kushalicious/jevcache) |
| Docker | `ghcr.io/kushals256/jevcache:latest` |

### Docker

```bash
docker run --rm -p 8080:8080 \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  -e UPSTREAM_API_KEY=$OPENROUTER_API_KEY \
  ghcr.io/kushals256/jevcache:latest
```

### CLI

```bash
npx @kushalicious/jevcache init           # .env + OpenAI / LangChain / env snippets
npx @kushalicious/jevcache doctor         # check keys
npx @kushalicious/jevcache start          # run proxy (default)
npx @kushalicious/jevcache start --demo   # boot + live MISS → HIT
npx @kushalicious/jevcache help
```

Env: `JEVCACHE_DEMO=1` (same as `--demo`), `JEVCACHE_QUIET=1` (hide HIT lines).

> First `npx` may compile `better-sqlite3` (needs basic build tools). Prefer Docker if that fails.

## Easiest: paste into Cursor / your coding agent

Open a **new agent chat** and paste the prompt in [`AGENT_SETUP.md`](./AGENT_SETUP.md). The agent installs jevcache, asks once for your OpenRouter key, starts the proxy, and points the project at `http://127.0.0.1:8080/v1`.

<details>
<summary>Click to expand the prompt</summary>

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

## How it works

1. **Policy** — bypass stream / tools / multimodal / volatile asks  
2. **Exact** — SHA-256 of canonical request (per model + system prompt)  
3. **Candidates** — recent prompts in that namespace  
4. **Jev admit** — `same_intent` + pick best candidate  
5. **Miss** → upstream LLM → store  
6. **Fail open** — if Jev errors, still call upstream  

Each `model` id has its own cache namespace. You choose the model; jevcache decides whether to skip the call.

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

See `results/eval.json` — live Jev had **0 false positives** on 100 fixtures vs a high Jaccard FP rate.

## Not in v0

Streaming cache HITs, tool-call caching, hosted multi-tenant SaaS, auto model routing.

## Privacy / license

Local SQLite under `DATA_DIR`. Semantic tier sends truncated prompts to OpenRouter. MIT.
