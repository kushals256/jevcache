# jevcache

**Routers pick a model. jevcache decides whether to call one.**

OpenAI-compatible proxy that skips expensive chat completions when [TypeSafe Jev](https://typesafe.ai) judges **same intent** as a cached ask — calibrated `noul`, not cosine similarity.

> Embedding semantic caches (GPTCache, etc.) already exist. **jevcache’s wedge:** candidates may be recent/near-duplicate, but **only Jev can admit a semantic HIT.**

## Quick start

```bash
cp .env.example .env
# set OPENROUTER_API_KEY + UPSTREAM_API_KEY (can be the same OpenRouter key)

npm install
npm run dev
```

Point any OpenAI SDK at the proxy:

```js
import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.UPSTREAM_API_KEY,
  baseURL: "http://127.0.0.1:8080/v1",
});
```

Or Docker:

```bash
export OPENROUTER_API_KEY=... UPSTREAM_API_KEY=... JEVCACHE_ADMIN_TOKEN=dev-admin
docker compose up --build
open http://127.0.0.1:8080/stats   # header X-Jevcache-Admin: dev-admin if token set
```

## How it works

1. **Policy** — bypass stream / tools / multimodal / volatile asks  
2. **Exact** — SHA-256 of canonical request in a tenant|model|system|tools namespace  
3. **Candidates** — last N prompts in that namespace (v0; embeddings optional later)  
4. **Jev admit** (`admit-v1`) — `same_intent` noul + `best` choice; threshold default `0.85`  
5. **Miss** → upstream → store (SQLite)  
6. **Fail open** — if Jev errors, call upstream (never invent answers)

Response headers: `X-Jevcache: HIT|MISS|BYPASS`, `X-Jevcache-Tier`, `X-Jevcache-Intent`, `X-Jevcache-Saved-USD`, `X-Jevcache-Entry-Id`.

## Stats

`GET /stats` — hit rate, estimated $ saved vs Jev spend (estimates from `src/prices.ts`).

Protect with `JEVCACHE_ADMIN_TOKEN` when binding non-localhost.

## Eval (anti-hype)

```bash
npm run eval                       # Jaccard baseline on 100 fixtures
LIVE=1 OPENROUTER_API_KEY=... npm run eval   # + live Jev metrics → results/eval.json
```

Commit measured numbers before tweeting. Don’t invent savings %.

## Local e2e without API keys

```bash
bash scripts/e2e_mock.sh   # MOCK_UPSTREAM + MOCK_JEV — asserts exact + semantic HIT
```

## Demo burn

```bash
# terminal 1
npm run dev
# terminal 2
UPSTREAM_API_KEY=... OPENROUTER_API_KEY=... npm run demo
```

## What v0 does **not** do

- Streaming cache HITs (stream = bypass/passthrough)
- Tool-call caching
- Multi-node / Redis
- OpenAI Responses API / Anthropic Messages (501)

## Privacy

Cache lives on disk under `DATA_DIR` (TTL + LRU). Semantic tier sends truncated, redacted user text to OpenRouter Decisions API. You operate the box — flush with `POST /admin/flush`.

## License

MIT
