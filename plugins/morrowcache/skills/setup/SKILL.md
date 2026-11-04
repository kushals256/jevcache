---
name: setup
description: Add an LLM response cache to the app in this project. Installs MorrowCache (npm @kushalicious/jevcache), a local OpenAI-compatible proxy, points the app's OpenAI-compatible client at it, and proves a MISS then a HIT. Use when the user wants to cache LLM API calls, cut OpenAI or OpenRouter cost on repeated or reworded prompts, or add semantic caching to their app. It caches the app's model calls, not Claude Code's own.
argument-hint: "[cloud | local | exact-only]"
allowed-tools: Read Grep Glob Bash(node --version) Bash(npx --yes @kushalicious/jevcache@latest *)
---

# Set up MorrowCache for this project

MorrowCache is a local proxy for the OpenAI Chat Completions API. The app sends its requests to
`http://127.0.0.1:8080/v1` instead of its provider; repeated or reworded questions are answered
from a local SQLite cache, everything else goes to the real provider. A paraphrase is only
reused when an LLM judge admits it; if the judge errors, the request goes to the model.

Tell the user up front, in one or two sentences, what this will do and that it caches **their
app's** model calls. It does not change Claude Code's own model calls.

The user's argument, if any: `$ARGUMENTS` (`cloud`, `local` or `exact-only` picks the judge and
skips that question).

## Ground rules

- Inspect before changing anything. Change as little as possible and list every change at the end.
- Never print, echo or log the value of an API key. Refer to keys by variable name only.
- Never copy `.env` anywhere. `init` keeps every value already in it, so no backup is needed.
- Never commit. Never stage `.env` or the cache directory.
- Do not stop or kill a process you did not start. If port 8080 is taken by something else, use
  another port (step 4).
- If something in a step fails, say what failed and stop rather than guessing.

## 1. Inspect the project

Find how the app calls a model. Search the source (skip `node_modules`, `.venv`, `dist`, build
output) for: `new OpenAI(`, `OpenAI(`, `AsyncOpenAI(`, `chat.completions`, `createOpenAI`,
`ChatOpenAI`, `/chat/completions`, `baseURL`, `base_url`, `OPENAI_BASE_URL`, `responses.create`,
`@anthropic-ai/sdk`, `anthropic`, `google-genai`.

Classify what you find:

| Found | What to do |
| --- | --- |
| OpenAI SDK `chat.completions.create` (Node or Python), LangChain `ChatOpenAI`, AI SDK `createOpenAI` used with `.chat(...)`, or plain HTTP to `/chat/completions` | Supported. Continue. |
| OpenAI Responses API (`responses.create`), or AI SDK `openai("model")` without `.chat` | MorrowCache answers `/v1/responses` with 501. Explain this. Only continue if the user agrees to switch those calls to Chat Completions (for the AI SDK, `openai.chat("model")`). |
| Only Anthropic, Gemini or other non-OpenAI-compatible SDKs | Not supported. Say so plainly and stop. |
| No model calls found | Say so. Offer to run only the proof in step 6 so they can see it work, then stop. |

Also note, without changing anything yet:
- The base URL the app uses today. No base URL with the OpenAI SDK means `https://api.openai.com/v1`.
  `https://openrouter.ai/api/v1` means OpenRouter. A localhost URL means a local server (Ollama,
  vLLM, llama.cpp).
- Which environment variable holds the API key, and whether the app loads `.env` (dotenv,
  `python-dotenv`, a framework that loads it, or none).
- The model ID the app uses.

## 2. Check Node.js

Run `node --version`. Version 22.5 or later is required (the cache uses `node:sqlite`).
If it is older or missing, tell the user how to install Node 22 LTS for their OS and stop, or
offer Docker instead:
`docker run -d --name morrowcache -p 8080:8080 --env-file .env -v morrowcache-data:/data ghcr.io/kushals256/jevcache:latest`

## 3. Ask one question: which judge

Unless `$ARGUMENTS` already answered it, ask once, in one message:

- **cloud** (default): TypeSafe Jev through OpenRouter judges paraphrases. Needs
  `OPENROUTER_API_KEY` in `.env`. About $0.00002 per check.
- **local**: a judge already running on this machine (`ADJUDICATOR=kev`, `laya`, `laya-mlx`, or
  `systemone` with `ADJUDICATOR_URL` and `ADJUDICATOR_MODEL`). Nothing leaves the machine for judging.
- **exact-only**: no judge (`ADJUDICATOR=none`). Only byte-identical requests hit. Safe, but
  rewordings miss.

If they pick cloud and `OPENROUTER_API_KEY` is not in `.env`, ask them to add it to `.env`
themselves (so the value never passes through the chat), or fall back to exact-only.

Note: when `ADJUDICATOR` is unset and `OPENROUTER_API_KEY` is in `.env` (common for apps that use
OpenRouter), the cloud judge turns on by itself. For exact-only you must set `ADJUDICATOR=none`.

## 4. Configure

From the project root, run:

```
npx --yes @kushalicious/jevcache@latest init
```

This creates or updates `.env`. It keeps values already in the file and sets
`OPENAI_BASE_URL=http://127.0.0.1:8080/v1`, `HOST`, `PORT`, `DATA_DIR=./data` and
`UPSTREAM_BASE_URL`.

Then edit `.env` so MorrowCache forwards misses to the provider the app used before:
- `UPSTREAM_BASE_URL`: the base URL from step 1 (`https://api.openai.com/v1` for OpenAI direct;
  the default `https://openrouter.ai/api/v1` is already right for OpenRouter).
- `ADJUDICATOR`: leave unset for cloud; `kev`, `laya`, `laya-mlx` or `systemone` for a local
  judge; `none` for exact-only.
- If `.env` contains `MOCK_UPSTREAM=1` or `MOCK_JEV=1`, point it out: misses get fake answers and
  hits are synthetic. Leave them only if the user wants a demo.
- If port 8080 is in use by another program, set `PORT` to a free port and update
  `OPENAI_BASE_URL` to match.

The app's own `Authorization` header is forwarded to the upstream, so the app keeps using its
existing key. `UPSTREAM_API_KEY` is only needed for clients that send no key.

Make sure `.gitignore` contains `.env` and `data/` (add the lines if missing). The cache lives in
`./data`.

These are the only settings this setup needs. You do not need to read the package source.

## 5. Start the proxy and point the app at it

Start it as a background process from the project root, so it reads `.env` and keeps running:

```
npx --yes @kushalicious/jevcache@latest start
```

Wait until `http://127.0.0.1:8080/healthz` (or the chosen port) responds, then run
`npx --yes @kushalicious/jevcache@latest status`. The startup output says which judge is active or
that it is running exact-only.

Point the app at the proxy with the smallest change that works:
- If the client takes no explicit base URL and the app loads `.env`, the OpenAI SDKs read
  `OPENAI_BASE_URL` on their own. No code change.
- If the base URL is hard-coded, make it read the environment, keeping the old value as the
  fallback, for example `baseURL: process.env.OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1"`
  or `base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")`. Removing the
  variable from `.env` then turns the cache off.
- LangChain JS: `configuration: { baseURL: ... }`. LangChain Python: `base_url=...`.
- AI SDK: `createOpenAI({ baseURL: ... })` and call models with `openai.chat("model")`.

Show the diff for any code change before making it.

Check that the app actually loads `.env`, otherwise it never sees `OPENAI_BASE_URL` and silently
bypasses the cache. If nothing loads it (no dotenv, no framework that does), tell the user and
suggest the smallest fix for how they run it, for example `node --env-file=.env app.js` in the
start script for Node 20.6+, or `load_dotenv()` for Python. Ask before adding a dependency.

## 6. Prove it

Run, from the project root, with the app's model ID and the name of the variable that holds its
API key (the key is read from `.env` and never printed):

```
npx --yes @kushalicious/jevcache@latest verify --model=<model id> --key-env=<VARIABLE_NAME>
```

It sends a question (expect `MISS`), the same question reworded (`HIT` with tier `jev` if the
judge admits it), and the first question again byte for byte (expect `HIT`, tier `exact`), and
prints only the `X-Jevcache` headers. It costs at most two real model calls.

The judge is deliberately conservative, so a reworded miss is normal. Say so honestly instead of
retrying until it hits. With exact-only, the reworded request always misses.

If `verify` reports an HTTP error from the upstream, the usual causes are a wrong
`UPSTREAM_BASE_URL` for that model ID, or a wrong `--key-env`.

If the app has a quick way to run (a script, a test, a dev route), you can also run it twice and
read `npx --yes @kushalicious/jevcache@latest status`.

## 7. Report

Finish with a short summary:
- Judge in use (cloud, local kind, or exact-only) and the proxy URL.
- Every file changed (`.env` keys by name, `.gitignore`, code files with one line each).
- Whether MISS then HIT was shown, and which tier hit.
- How to run it later: `npx @kushalicious/jevcache@latest start` from the project root.
- How to see results: `http://127.0.0.1:8080/stats`, or `/morrowcache:stats`.
- How to turn it off: remove `OPENAI_BASE_URL` from `.env` (or send header `X-Jevcache-Bypass: 1`
  on a request), and delete `./data` for a cold cache.

Limits worth one line each if relevant: Chat Completions only; responses containing tool calls
are never stored, so tool steps always run; time-sensitive questions ("latest ...") are not reused;
one process, one SQLite file.
