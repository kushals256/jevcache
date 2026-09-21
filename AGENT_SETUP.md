# Paste this into Cursor / Claude Code / any coding agent

Copy everything inside the box below into a **new chat**. The agent will install jevcache, wire your app, and prove a MISS → HIT.

---

## Agent prompt (copy all)

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

---

## After the agent finishes

1. Confirm `GET http://127.0.0.1:8080/healthz` is ok.
2. Open `http://127.0.0.1:8080/stats` or run `jevcache status`.
3. Keep `OPENROUTER_API_KEY` only in local `.env` (never commit).
4. Freshness is on by default (live/short TTLs; stable agent paraphrases unchanged). Rollback: `FRESHNESS_MODE=off`.
