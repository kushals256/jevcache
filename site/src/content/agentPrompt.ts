// Keep in sync with ../../AGENT_SETUP.md (fenced prompt body only)

export const INSTALL = "npx @kushalicious/jevcache@latest"

export const BASE_URL_SNIPPET = `baseURL: "http://127.0.0.1:8080/v1"`

/** Full paste-into-agent prompt — byte-identical to AGENT_SETUP.md fence */
export const AGENT_PROMPT = `You are setting up MorrowCache (npm: @kushalicious/jevcache) for me in this project.

Goal: run a local OpenAI-compatible proxy that skips chat completions when a same-intent adjudicator admits a paraphrase (not cosine). Default judge = cloud TypeSafe Jev; local Kev / Laya / Laya MLX / any System One also supported.

Repo: https://github.com/kushals256/jevcache
npm: npx @kushalicious/jevcache@latest
Site: https://morrowcache.vercel.app/agent-setup

Do ALL of the following without asking me to run terminal commands myself (you run them):

1. Check Node.js >= 22.5. If missing, tell me how to install it in one step for my OS.
2. Prefer the easiest install that works:
   a) Try: npx --yes @kushalicious/jevcache@latest doctor
      (fallback: npx --yes github:kushals256/jevcache doctor)
   b) If that fails, use Docker with ghcr.io/kushals256/jevcache:latest on port 8080
   c) Or clone into ../jevcache, npm install, npm run build.
3. Ask me ONCE which adjudicator path I want:
   A) Cloud Jev (default) — need OPENROUTER_API_KEY for same-intent admits
   B) Local Kev / Laya / Laya MLX / System One — set ADJUDICATOR=kev|laya|laya-mlx|systemone;
      no OpenRouter key required for admits. For systemone also set ADJUDICATOR_URL + ADJUDICATOR_MODEL.
   If neither path is ready, warn that the proxy will run EXACT-ONLY (paraphrases will MISS).
4. Ask for an upstream chat API key if needed for real completions, or use MOCK_UPSTREAM=1 for a synthetic demo.
   Save secrets to .env (never commit; ensure .gitignore has .env).
5. Run: npx @kushalicious/jevcache init  (writes OPENAI_BASE_URL into .env)
6. Start MorrowCache in the background on http://127.0.0.1:8080 (or PORT if set). Verify GET /healthz.
   Prefer: npx @kushalicious/jevcache doctor --live
7. Wire THIS app so OpenAI-compatible clients use baseURL "http://127.0.0.1:8080/v1".
8. Add SETUP_JEVCACHE.md with start command, ADJUDICATOR kind, baseURL, and /stats link.
9. Optionally add .cursor/rules/jevcache.mdc so future agents keep that baseURL.
10. Prove it: paraphrased prompts → expect MISS then HIT (or run start --demo). Show X-Jevcache headers or /stats.
    Do not expect HIT for streaming or tools requests (bypass by design).

Do not commit secrets. If install fails, try the next method (npx → docker → clone).

When done, tell me: start command, ADJUDICATOR kind, baseURL, key locations (not values), whether MISS → HIT passed, stats URL.`

export const AGENT_PROMPT_PREVIEW = AGENT_PROMPT.split("\n").slice(0, 6).join("\n")
