# Contributing

Thanks for checking out jevcache.

## Dev setup

```bash
git clone https://github.com/kushals256/jevcache
cd jevcache
npm install
npm test
npm run build
npm start
```

Keyless smoke:

```bash
MOCK_JEV=1 MOCK_UPSTREAM=1 npm start -- --demo
```

## Principles

- Keep the default path one-command (`npx @kushalicious/jevcache@latest`).
- Prefer **fail-open**: if the adjudicator fails, still call upstream.
- **Precision-first**: prefer miss over a wrong HIT.
- Package name stays `@kushalicious/jevcache` — no rename / unpublish games.
- New adjudicator backends: implement `IntentAdjudicator`, register in `src/adjudicator/factory.ts`, document when `jevcache doctor --live` passes (offline eval stays mock/OpenRouter).
- Don’t commit `.env`, keys, or local `data/`.
- Add or update tests when you touch fingerprint / store / server / adjudicator paths.

## Issues

- **Wrong HIT / stale reuse** → bug template, include `X-Jevcache-*` headers.

Include: install method (`npx` / Docker / source), Node version, and whether `/healthz` works.
