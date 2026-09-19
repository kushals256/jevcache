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

## Guidelines

- Keep the default path one-command (`npx @kushalicious/jevcache@latest`).
- Prefer fail-open: if Jev fails, still call upstream.
- Don’t commit `.env`, keys, or local `data/`.
- Add or update tests for fingerprint / store behavior when you touch those paths.

## Issues

Use the bug template for failures. Include: install method (`npx` / Docker / source), Node version, and whether `/healthz` works.
