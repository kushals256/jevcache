# Security

## Reporting
Please open a GitHub Security Advisory on this repository, or email the maintainer privately if you cannot use advisories.

## Scope
- Do not store real production secrets in cache without understanding local disk retention (`TTL_SECONDS`, class TTLs under freshness mode, `MAX_ENTRIES`).
- Semantic tier sends truncated, **redacted** prompt text to the configured adjudicator: OpenRouter Decisions (default Jev) or a **local/self-hosted System One** URL (`ADJUDICATOR=kev|laya|…`). Redaction is best-effort — treat the cache DB as sensitive. Local backends still receive prompt text on loopback; trust the host.
- Never expose `/stats`, `/receipt`, or `/admin/*` on a public bind without `JEVCACHE_ADMIN_TOKEN`. `/receipt` uses the same lock as `/stats`.
- MorrowCache 2.0 may store **final assistant text** for requests that include a tools schema or tool-role history. It never stores or replays `tool_calls` / `function_call` responses. `X-Jevcache-Job-Id` is a cache grouping key, not authentication and not a tenant boundary.
- Trust path: client → proxy → SQLite on disk; adjudicator receives last-user text only; upstream sees the full body on a miss. A hit does not call upstream.
- **Single-node SQLite** — one process, one volume. Multi-instance against the same file is unsupported.
- Multi-tenant: set `X-Jevcache-Tenant` (or distinct `Authorization` material). Without tenants, all clients share one namespace. This is **not** a hardened multi-tenant cloud security boundary.

## When not to use
Personalized balances, secrets, or anything that must never be reused across users/sessions. Prefer bypass (`X-Jevcache-Bypass: 1`) or don’t run the proxy for those calls.

## Known limitations
Streaming final text can HIT. A stream miss is labeled MISS before the body; the next identical request can HIT. False intent admits are possible — tune `INTENT_THRESHOLD` and use `JEVCACHE_SHADOW=1` when validating. `JOB_CROSS_PRIOR=on` widens intent matches across different priors. Tool-history text may remain in SQLite until TTL or admin flush. Erasure is TTL plus `POST /admin/flush` or `DELETE /admin/entry/:id`, not a per-user purge API.
Freshness cues are **English-biased**; world changes with identical wording inside a stable TTL can still HIT; multi-turn referent shifts are not validated (last user text only). Rollback: `FRESHNESS_MODE=off`.
