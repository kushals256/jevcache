# Changelog

## Unreleased
- **Product name:** MorrowCache. npm package and CLI remain `@kushalicious/jevcache` / `jevcache`. Marketing site in `site/`.

## 0.3.1 — 2026-09-25
- Republish of **0.3.0** (System One backends). npm staged `0.3.0` without promoting to the public registry; `0.3.1` is the installable release.

## 0.3.0 — 2026-09-25
- **Local System One backends:** `ADJUDICATOR=kev|laya|laya-mlx|systemone|local` via `/v1/systemone`. Defaults: Kev `:8008`/`kev-latest`, Laya `:8000`/`laya-latest`. Optional `ADJUDICATOR_URL`, `ADJUDICATOR_MODEL`, `ADJUDICATOR_API_KEY`, `ADJUDICATOR_TIMEOUT_MS`.
- **Admit gate fix:** semantic path uses `adjudicatorReady` — local Kev/Laya work **without** `OPENROUTER_API_KEY`. Unknown kinds no longer silently fall back to Jev.
- **Doctor / healthz / banners** report adjudicator kind + ready; doctor probes via `createAdjudicator`. HTTP_PROXY tip for localhost.
- **Schema:** System One noul questions use `criteria: {true,false}`; choice labels use truncated candidate text; soft-cap 7 candidates.
- Default **Jev Decisions** path unchanged. Metric keys stay `hits_jev` (dashboard label: intent/adj).
- Includes 0.2.0 surface (factory, freshness reasons, server tests) if that tag was never published separately.

## 0.2.0 — 2026-09-23
- **Docs:** clearer product story (chat generation gate, fail-open, freshness). Same package name `@kushalicious/jevcache` (no rename).
- **Pivot-ready adjudicator:** `IntentAdjudicator` factory (`src/adjudicator/`). Default **Jev**; `mock` via `MOCK_JEV` / `ADJUDICATOR=mock`. `JEV_*` env unchanged; optional `ADJUDICATOR` / `ADJUDICATOR_URL`. Laya/Kev **not shipped** — don’t set them yet.
- **Freshness visibility:** MISS after stale refuse may set `X-Jevcache-Reason: freshness_stale` (or `freshness_reuse_refused`); `/stats` still tracks `freshness_rejects`.
- **Tests:** server integration (fail-open, shadow, tenant, stream/tools bypass, freshness refuse) + adjudicator factory.
- Docs: principles, when-not-to-use, claim discipline, single-replica SQLite, kill criteria.

## 0.1.6 — 2026-09-21
- **Temporal freshness (admit-v2):** precision-first classes (`live` / `short` / `stable` / `durable`), class TTLs + jitter, hard age filter on exact + Jev candidates, same-call `reuse_fresh` when candidate age ≥ `FRESHNESS_JEV_MIN_AGE_MS` (default 5m — demos stay HIT).
- Live requests bypass (wins over high-temperature `exact_only`). Rollback: `FRESHNESS_MODE=off` restores legacy volatile regex + single `TTL_SECONDS`.
- Store columns `freshness_class` / `as_of`; stats `freshness_rejects`; headers `X-Jevcache-Freshness`, optional `X-Jevcache-Max-Age-Seconds`.
- Fix: `X-Jevcache-Bypass` now uses the request `Authorization` key (not only `UPSTREAM_API_KEY`).
- Fix: stream bypass respects `MOCK_UPSTREAM` (no real network in mock/demo).

## 0.1.5 — 2026-09-19
- **No native SQLite compile** — `node:sqlite` (Node ≥ 22.5); `npx` bin enables `--experimental-sqlite`.
- `jevcache init` writes `OPENAI_BASE_URL` (and related) into the app `.env`.
- `jevcache status` — running? hit rate / est. $ saved.
- Clear **EXACT-ONLY vs Jev** banner when OpenRouter key is missing.
- README: verified real-app MISS→HIT numbers, demo SVG, OG image under `docs/`.
- Release workflow: npm publish with provenance + `id-token` (Trusted Publishing ready).
- Docker image on Node 22; drop g++/python build deps.

## 0.1.4 — 2026-09-19
- Session summary on Ctrl+C / SIGTERM: requests · hits · ~$ saved · stats URL.
- TTY colors: green HIT, dim MISS (`JEVCACHE_NO_COLOR=1` / `NO_COLOR` to disable).
- `jevcache doctor --live` probes `/healthz`, Jev Decisions, and upstream `/models`.
- `jevcache open` opens `/stats` in the default browser.
- README npm downloads badge.

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
