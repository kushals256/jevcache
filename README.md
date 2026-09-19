# jevcache

**Routers pick a model. jevcache decides whether to call one.**

OpenAI-compatible proxy that skips expensive chat completions when [TypeSafe Jev](https://typesafe.ai) judges **same intent** — calibrated decisions, not cosine similarity.

## Run in one command

```bash
npx jevcache@latest
```

It will ask for your [OpenRouter API key](https://openrouter.ai/keys) if needed, then print the `baseURL` to paste into your app.

**Docker (also one command):**

```bash
docker run --rm -p 8080:8080 \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  -e UPSTREAM_API_KEY=$OPENROUTER_API_KEY \
  ghcr.io/kushals256/jevcache:latest
```

Then in any OpenAI SDK / LangChain OpenAI client:

```js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "http://127.0.0.1:8080/v1", // ← jevcache
});

// use any model your upstream supports
await client.chat.completions.create({
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "Explain mutexes" }],
});
```

Stats: [http://127.0.0.1:8080/stats](http://127.0.0.1:8080/stats)

### CLI

```bash
npx jevcache init      # write .env
npx jevcache doctor    # check keys
npx jevcache start     # run proxy (default)
npx jevcache help
```

> First `npx` may compile `better-sqlite3` (needs basic build tools). Prefer Docker if install fails.

## How it works

1. **Policy** — bypass stream / tools / multimodal / volatile asks  
2. **Exact** — SHA-256 of canonical request (per model + system prompt)  
3. **Candidates** — recent prompts in that namespace  
4. **Jev admit** — `same_intent` + pick best candidate  
5. **Miss** → upstream LLM → store  
6. **Fail open** — if Jev errors, still call upstream  

Works with **multiple models**: each `model` id has its own cache namespace. You choose the model in the request; jevcache decides whether to skip the call.

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

See `results/eval.json` — live Jev had **0 false positives** on 100 fixtures vs high Jaccard FP rate.

## Not in v0

Streaming cache HITs, tool-call caching, hosted multi-tenant SaaS, auto model routing.

## Privacy / license

Local SQLite under `DATA_DIR`. Semantic tier sends truncated prompts to OpenRouter. MIT.
