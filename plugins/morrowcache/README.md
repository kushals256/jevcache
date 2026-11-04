# MorrowCache plugin for Claude Code

Adds an LLM response cache to the app you are building. Claude sets up
[MorrowCache](https://morrowcache.vercel.app) (npm `@kushalicious/jevcache`), a local
OpenAI-compatible proxy, points your app's client at it, and proves a MISS then a HIT.

It caches **your app's** model calls through the OpenAI Chat Completions API. It does not change
or cache Claude Code's own model calls.

## Install

```
/plugin marketplace add kushals256/jevcache
/plugin install morrowcache@morrowcache
```

## Skills

| Skill | What it does |
| --- | --- |
| `/morrowcache:setup [cloud\|local\|exact-only]` | Inspects how your app calls a model, installs and starts the proxy, wires the base URL with the smallest change, and shows `X-Jevcache: MISS` then `HIT`. |
| `/morrowcache:stats` | Hit rate, money saved vs judge cost, latency, and why a request hit or missed. |

Claude can also pick these up on its own when you ask to cache LLM calls or check the cache.

## Requirements

- Node.js 22.5+ (or Docker).
- An app that uses an OpenAI-compatible Chat Completions client: OpenAI SDK (Node or Python),
  Vercel AI SDK with `openai.chat(...)`, LangChain `ChatOpenAI`, or plain HTTP. The Responses API
  and Anthropic or Gemini SDKs are not supported.
- For judged paraphrase hits: an `OPENROUTER_API_KEY` (cloud judge) or a local judge. Without one,
  only identical requests hit.

## What it changes in your project

`.env` (adds `OPENAI_BASE_URL` and proxy settings, keeps existing values), `.gitignore` (`.env`,
`data/`), and at most a one-line base-URL change in your client code, shown to you first. Nothing
is committed. Turn it off by removing `OPENAI_BASE_URL` from `.env`.

Docs: [integrations](https://morrowcache.vercel.app/integrations) ·
[benchmark](https://morrowcache.vercel.app/benchmark) · MIT
