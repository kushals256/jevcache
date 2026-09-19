# Changelog

## 0.1.3 — 2026-09-19
- Console HIT lines with estimated $ saved and running total (`JEVCACHE_QUIET=1` to hide).
- `jevcache init` / start banner print OpenAI SDK, LangChain, and `OPENAI_BASE_URL` wiring snippets.
- `jevcache start --demo` (or `JEVCACHE_DEMO=1`) runs a live MISS → HIT paraphrase demo after boot.
- Published to npm as `@kushalicious/jevcache` (`npx @kushalicious/jevcache@latest`). Unscoped `jevcache` was blocked (too similar to `decache`).
- CLI bin via `bin/jevcache.js` wrapper.

## 0.1.2 — 2026-09-19
- Fix Docker release: copy `tsconfig` + `src` before `npm install` so `prepare`/`tsc` succeeds.
- `prepare` skips build when sources are absent.

## 0.1.1 — 2026-09-19
- One-command CLI: `init` / `doctor` / interactive OpenRouter key, clearer DX.

## 0.1.0 — 2026-09-19
- Initial release: exact cache + Jev same-intent admit, OpenAI-compatible `/v1/chat/completions`, `/stats`, admin flush, Docker.
