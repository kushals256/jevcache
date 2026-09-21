# Security

## Reporting
Please open a GitHub Security Advisory on this repository, or email the maintainer privately if you cannot use advisories.

## Scope
- Do not store real production secrets in cache without understanding local disk retention (`TTL_SECONDS`, class TTLs under freshness mode, `MAX_ENTRIES`).
- Semantic tier sends truncated, redacted prompt text to OpenRouter's Decisions API.
- Never expose `/stats` or `/admin/*` on a public bind without `JEVCACHE_ADMIN_TOKEN`.
- Do not use jevcache to cache tool-calling / side-effecting agent traffic (bypassed by design when `tools` present).

## Known limitations
v0 bypasses streaming for cache population; false intent admits are possible — tune `INTENT_THRESHOLD` and use `JEVCACHE_SHADOW=1` when validating.
Freshness cues are English-biased; world changes with identical wording inside a stable TTL can still HIT; multi-turn referent shifts are not validated (last user text only). Rollback: `FRESHNESS_MODE=off`.
