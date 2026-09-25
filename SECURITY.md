# Security

## Reporting
Please open a GitHub Security Advisory on this repository, or email the maintainer privately if you cannot use advisories.

## Scope
- Do not store real production secrets in cache without understanding local disk retention (`TTL_SECONDS`, class TTLs under freshness mode, `MAX_ENTRIES`).
- Semantic tier sends truncated, **redacted** prompt text to the configured adjudicator: OpenRouter Decisions (default Jev) or a **local/self-hosted System One** URL (`ADJUDICATOR=kev|laya|…`). Redaction is best-effort — treat the cache DB as sensitive. Local backends still receive prompt text on loopback; trust the host.
- Never expose `/stats` or `/admin/*` on a public bind without `JEVCACHE_ADMIN_TOKEN`.
- Do not use jevcache to cache tool-calling / side-effecting agent traffic (bypassed by design when `tools` present).
- **Single-node SQLite** — one process, one volume. Multi-instance against the same file is unsupported.
- Multi-tenant: set `X-Jevcache-Tenant` (or distinct `Authorization` material). Without tenants, all clients share one namespace. This is **not** a hardened multi-tenant cloud security boundary.

## When not to use
Personalized balances, secrets, or anything that must never be reused across users/sessions. Prefer bypass (`X-Jevcache-Bypass: 1`) or don’t run the proxy for those calls.

## Known limitations
v0 bypasses streaming for cache population; false intent admits are possible — tune `INTENT_THRESHOLD` and use `JEVCACHE_SHADOW=1` when validating.
Freshness cues are **English-biased**; world changes with identical wording inside a stable TTL can still HIT; multi-turn referent shifts are not validated (last user text only). Rollback: `FRESHNESS_MODE=off`.
