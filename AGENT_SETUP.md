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

1. Check Node.js >= 20. If missing, tell me how to install it in one step for my OS.
2. Prefer the easiest install that works:
   a) Try: npx --yes @kushalicious/jevcache@latest doctor
      (fallback: npx --yes github:kushals256/jevcache doctor)
   b) If native build fails, use Docker:
      docker run --rm -d --name jevcache -p 8080:8080 \
        -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
        -e UPSTREAM_API_KEY=$OPENROUTER_API_KEY \
        ghcr.io/kushals256/jevcache:latest
   c) Or clone into a sibling folder ../jevcache, npm install, npm run build.
3. Ask me ONCE for an OpenRouter API key (https://openrouter.ai/keys) if OPENROUTER_API_KEY is not already in the environment or a local .env. Save it to .env in the project or jevcache folder (never commit .env; ensure .gitignore has .env).
4. Start jevcache in the background on http://127.0.0.1:8080 and verify GET /healthz returns ok.
5. Wire THIS app to use the proxy:
   - Any OpenAI SDK / fetch to OpenAI-compatible APIs should use:
     baseURL = "http://127.0.0.1:8080/v1"
     apiKey = the same OpenRouter key (or existing upstream key)
   - Prefer env vars: OPENAI_BASE_URL / OPENROUTER base URL override pointing at the proxy.
   - If the project has a .env.example, update it with commented jevcache vars.
6. Add a short note to the project README (or create SETUP_JEVCACHE.md):
   - how to start jevcache
   - baseURL to use
   - link to http://127.0.0.1:8080/stats
7. Optionally add .cursor/rules/jevcache.mdc so future agents keep using baseURL http://127.0.0.1:8080/v1 for chat completions while jevcache is the local cache proxy.
8. Prove it works: two chat calls with paraphrased prompts. Expect MISS then HIT (jev or exact). Show X-Jevcache headers or /stats.

Constraints:
- Do not commit secrets.
- Do not force tool-calling / streaming traffic through cache expectations (jevcache bypasses those).
- If something fails, diagnose and pick the next install method (npx → docker → clone).

When done, reply with:
- How I start jevcache next time (one command)
- Exact baseURL
- Where my key is stored
- Whether MISS → HIT passed
- Link to stats (http://127.0.0.1:8080/stats)
```

---

## After the agent finishes

1. Keep jevcache running while you develop.  
2. Open [http://127.0.0.1:8080/stats](http://127.0.0.1:8080/stats) (or `npx @kushalicious/jevcache open`).  
3. You still need your own [OpenRouter](https://openrouter.ai/keys) key for real Jev hits (usage billed to you).

## Optional Cursor rule

See [templates/cursor-rule-jevcache.mdc](./templates/cursor-rule-jevcache.mdc) — copy to `.cursor/rules/jevcache.mdc`.
