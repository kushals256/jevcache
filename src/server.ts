/** SPDX-License-Identifier: MIT */
import { Hono } from "hono";
import { createHash, randomUUID } from "node:crypto";
import type { Config } from "./config.js";
import {
  buildNamespace,
  exactKey,
  isTurnTier,
  lastUserText,
  normalizeJobId,
  priorDigest,
  priorEndsWithPendingToolCalls,
  systemHash,
  temperatureBucket,
  toolsHash,
  turnNamespace,
  type ChatRequest,
} from "./fingerprint.js";
import { isStorableCompletion } from "./response_guard.js";
import { assembleSseText, synthesizeHitSse } from "./stream_cache.js";
import { decidePolicy } from "./policy.js";
import { CacheStore, type CacheEntry } from "./store/sqlite.js";
import { SingleFlight } from "./singleflight.js";
import { createAdjudicator, adjudicatorReady, resolveAdjudicatorKind } from "./adjudicator/index.js";
import type { IntentAdjudicator } from "./adjudicator/types.js";
import {
  proposeCandidates,
  entryIdForChoice,
  maxCandidateAgeMs,
  type RankedCandidate,
} from "./candidates.js";
import { forwardChatCompletions, forwardModels, usageFromBody } from "./upstream.js";
import { estimateCostUsd } from "./prices.js";
import {
  createStats,
  summarize,
  pushLatency,
  recordHit,
  type Stats,
} from "./stats.js";
import { RateLimiter } from "./rate_limit.js";
import { preview, redactSecrets } from "./redact.js";
import {
  classifyFreshness,
  isFreshEnough,
  ttlMsForClass,
  type FreshnessClass,
  type FreshnessTtls,
} from "./freshness.js";

export type CacheHitEvent = {
  tier: "exact" | "jev" | "turn_exact" | "turn_jev";
  savedUsd: number;
  totalSavedUsd: number;
  preview: string;
  intent?: number;
};

export type CacheMissEvent = {
  spentUsd: number;
  preview: string;
};

export type AppHooks = {
  onHit?: (event: CacheHitEvent) => void;
  onMiss?: (event: CacheMissEvent) => void;
};

/** Optional deps for tests / custom backends without forking HIT logic. */
export type AppDeps = {
  adjudicator?: IntentAdjudicator;
};

export type App = {
  app: Hono;
  store: CacheStore;
  stats: Stats;
  config: Config;
  close: () => void;
};

function tenantFromAuth(auth: string | undefined, headerTenant: string | undefined): string {
  if (headerTenant?.trim()) return headerTenant.trim().slice(0, 128);
  if (!auth) return "anon";
  return createHash("sha256").update(auth).digest("hex").slice(0, 16);
}

function requireAdmin(c: { req: { header: (n: string) => string | undefined } }, cfg: Config): boolean {
  if (!cfg.adminToken) return cfg.host === "127.0.0.1" || cfg.host === "localhost";
  return c.req.header("X-Jevcache-Admin") === cfg.adminToken;
}

export function createApp(cfg: Config, hooks: AppHooks = {}, deps: AppDeps = {}): App {
  const store = new CacheStore(cfg.dataDir);
  const stats = createStats();
  const flight = new SingleFlight();
  const limiter = new RateLimiter(cfg.rateLimitRpm);
  const adjInjected = !!deps.adjudicator;
  const adjudicator = deps.adjudicator ?? createAdjudicator(cfg);
  const adjKind = resolveAdjudicatorKind(cfg);
  const adjReady = adjInjected || adjudicatorReady(cfg);
  const app = new Hono();

  const emitHit = (
    tier: "exact" | "jev" | "turn_exact" | "turn_jev",
    savedUsd: number,
    textPreview: string,
    intent?: number,
  ) => {
    recordHit(stats, tier, textPreview, intent);
    hooks.onHit?.({
      tier,
      savedUsd,
      totalSavedUsd: stats.saved_usd,
      preview: textPreview,
      intent,
    });
  };

  if (cfg.corsOrigin) {
    app.use("*", async (c, next) => {
      c.header("Access-Control-Allow-Origin", cfg.corsOrigin);
      c.header(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, X-Jevcache-Admin, X-Jevcache-Tenant, X-Jevcache-Bypass, X-Jevcache-Max-Age-Seconds, X-Jevcache-Job-Id",
      );
      c.header(
        "Access-Control-Expose-Headers",
        "X-Jevcache, X-Jevcache-Tier, X-Jevcache-Saved-USD, X-Jevcache-Entry-Id, X-Jevcache-Intent, X-Jevcache-Freshness, X-Jevcache-Reason",
      );
      c.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      if (c.req.method === "OPTIONS") return c.body(null, 204);
      await next();
    });
  }

  app.get("/healthz", (c) =>
    c.json({
      ok: true,
      turn_cache: cfg.turnCache,
      adjudicator: {
        name: adjudicator.name,
        kind: adjKind,
        ready: adjReady,
      },
    }),
  );
  app.get("/readyz", (c) => {
    try {
      store.count();
      return c.json({ ok: true });
    } catch (e) {
      return c.json({ ok: false, error: String(e) }, 503);
    }
  });

  const statsHandler = (c: { req: { header: (n: string) => string | undefined }; json: Function; html: Function }) => {
    if (!requireAdmin(c as never, cfg)) return (c as { json: Function }).json({ error: "unauthorized" }, 401);
    return null;
  };

  app.get("/stats.json", (c) => {
    const denied = statsHandler(c);
    if (denied) return denied;
    return c.json(summarize(stats));
  });

  app.get("/stats", (c) => {
    const denied = statsHandler(c);
    if (denied) return denied;
    const s = summarize(stats);
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>MorrowCache stats</title>
<style>body{font-family:ui-sans-serif,system-ui;max-width:720px;margin:2rem auto;padding:0 1rem;background:#0b0f14;color:#e7eef7}
h1{font-size:1.4rem} .grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem} .card{background:#151b24;border-radius:12px;padding:1rem}
.muted{color:#8b9bb0;font-size:.85rem} table{width:100%;border-collapse:collapse} td,th{padding:.35rem 0;border-bottom:1px solid #243041;text-align:left}
.big{font-size:1.6rem;font-weight:700}</style></head><body>
<h1>MorrowCache</h1>
<p class="muted">Routers pick a model. MorrowCache decides whether to call one. Estimates only.</p>
<div class="grid">
<div class="card"><div class="muted">Hit rate (overall)</div><div class="big">${(s.hit_rate * 100).toFixed(1)}%</div>
<div class="muted" style="margin-top:.35rem">Eligible (excl. bypass) ${(s.hit_rate_eligible * 100).toFixed(1)}% · bypass share ${(s.bypass_share * 100).toFixed(1)}%</div></div>
<div class="card"><div class="muted">Est. net saved</div><div class="big">$${(s.net_saved_usd).toFixed(4)}</div></div>
<div class="card"><div class="muted">Hits exact / intent</div><div class="big">${s.hits_exact} / ${s.hits_jev}</div></div>
<div class="card"><div class="muted">Miss / bypass</div><div class="big">${s.misses} / ${s.bypasses}</div></div>
<div class="card"><div class="muted">Freshness rejects</div><div class="big">${s.freshness_rejects}</div></div>
<div class="card"><div class="muted">Upstream $</div><div>$${s.upstream_spend_usd.toFixed(4)}</div></div>
<div class="card"><div class="muted">Adj $</div><div>$${s.jev_spend_usd.toFixed(4)}</div></div>
</div>
${s.cost_inversion_warning ? "<p class=muted>Warning: adjudicator spend high vs savings — raise INTENT_THRESHOLD or disable semantic.</p>" : ""}
<h2>Recent hits</h2>
<table><tr><th>Tier</th><th>Intent</th><th>Preview</th></tr>
${s.last_hits.map((h) => `<tr><td>${h.tier}</td><td>${h.intent?.toFixed?.(2) ?? "—"}</td><td>${escapeHtml(h.preview)}</td></tr>`).join("")}
</table>
<p class="muted">uptime ${(Date.now() - s.started_at) / 1000 | 0}s · schema admit-v2 · adjudicator ${escapeHtml(adjudicator.name)} (${adjKind}${adjReady ? "" : ", not ready"}) · freshness ${cfg.freshnessMode} · single-node SQLite</p>
</body></html>`;
    return c.html(html);
  });

  app.post("/admin/flush", (c) => {
    if (!requireAdmin(c, cfg)) return c.json({ error: "unauthorized" }, 401);
    const n = store.flush();
    return c.json({ flushed: n });
  });

  app.delete("/admin/entry/:id", (c) => {
    if (!requireAdmin(c, cfg)) return c.json({ error: "unauthorized" }, 401);
    const ok = store.delete(c.req.param("id"));
    return c.json({ deleted: ok });
  });

  app.get("/admin/entry/:id", (c) => {
    if (!requireAdmin(c, cfg)) return c.json({ error: "unauthorized" }, 401);
    const e = store.getById(c.req.param("id"));
    if (!e) return c.json({ error: "not_found" }, 404);
    return c.json(e);
  });

  app.get("/v1/models", async (c) => {
    const auth = c.req.header("Authorization");
    const key = bearer(auth) || cfg.upstreamApiKey;
    if (!key) {
      return c.json({
        object: "list",
        data: [{ id: "jevcache-passthrough", object: "model", created: 0, owned_by: "jevcache" }],
      });
    }
    const r = await forwardModels({
      baseUrl: cfg.upstreamBaseUrl,
      apiKey: key,
      timeoutMs: cfg.upstreamTimeoutMs,
    });
    if (!r.ok) return c.json(r.body, r.status as 502);
    return c.json(r.body);
  });

  app.get("/receipt", (c) => {
    if (!requireAdmin(c, cfg)) return c.json({ error: "unauthorized" }, 401);
    const s = summarize(stats);
    const payload = {
      started_at: s.started_at,
      requests: s.requests,
      hits_exact: s.hits_exact,
      hits_jev: s.hits_jev,
      hits_turn_exact: s.hits_turn_exact,
      hits_turn_jev: s.hits_turn_jev,
      tool_calls_bypass: s.tool_calls_bypass,
      stream_hits: s.stream_hits,
      saved_usd: s.saved_usd,
      turn_cache: cfg.turnCache,
    };
    if (c.req.query("format") === "md") {
      const md = [
        "# MorrowCache receipt",
        `- requests: ${payload.requests}`,
        `- hits exact / jev: ${payload.hits_exact} / ${payload.hits_jev}`,
        `- turn exact / jev: ${payload.hits_turn_exact} / ${payload.hits_turn_jev}`,
        `- tool_calls not stored: ${payload.tool_calls_bypass}`,
        `- stream hits: ${payload.stream_hits}`,
        `- est saved USD: ${payload.saved_usd}`,
        `- turn_cache: ${payload.turn_cache}`,
      ].join("\n");
      return c.text(md);
    }
    return c.json(payload);
  });

  app.post("/v1/chat/completions", async (c) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!limiter.allow(ip)) return c.json({ error: { message: "rate_limited" } }, 429);

    const cl = Number(c.req.header("content-length") || 0);
    if (Number.isFinite(cl) && cl > cfg.requestMaxBytes) {
      return c.json({ error: { message: "request_too_large" } }, 413);
    }

    stats.requests += 1;
    const t0 = Date.now();
    let body: ChatRequest;
    try {
      body = (await c.req.json()) as ChatRequest;
    } catch {
      return c.json({ error: { message: "invalid_json" } }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return c.json({ error: { message: "invalid_json" } }, 400);
    }
    if (JSON.stringify(body).length > cfg.requestMaxBytes) {
      return c.json({ error: { message: "request_too_large" } }, 413);
    }
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return c.json({ error: { message: "messages required" } }, 400);
    }
    if (body.messages.some((m) => !m || typeof m !== "object")) {
      return c.json({ error: { message: "invalid_messages" } }, 400);
    }

    const auth = c.req.header("Authorization");
    const upstreamKey = bearer(auth) || cfg.upstreamApiKey;

    if (c.req.header("X-Jevcache-Bypass") === "1") {
      return bypassUpstream(c, cfg, body, stats, t0, "client_bypass", upstreamKey);
    }

    const policy = decidePolicy(body, cfg.temperatureMax, {
      freshnessMode: cfg.freshnessMode,
      turnCache: cfg.turnCache,
    });
    const ttls = freshnessTtls(cfg);
    if (!upstreamKey && policy.mode === "bypass") {
      return c.json({ error: { message: "missing upstream API key" } }, 401);
    }

    if (policy.mode === "bypass") {
      return bypassUpstream(c, cfg, body, stats, t0, policy.reason, upstreamKey);
    }

    // Opt-in sample bypass (default 0) — popularity lock-in guard
    if (cfg.freshnessSampleBypass > 0 && Math.random() < cfg.freshnessSampleBypass) {
      stats.freshness_sample_bypass += 1;
      return bypassUpstream(c, cfg, body, stats, t0, "freshness_sample_bypass", upstreamKey);
    }

    if (!upstreamKey) {
      return c.json({ error: { message: "missing upstream API key (Authorization or UPSTREAM_API_KEY)" } }, 401);
    }

    const userText = lastUserText(body.messages);
    const reqClass: FreshnessClass =
      cfg.freshnessMode === "off" ? "stable" : policy.freshness;
    const headerMaxAge = parseMaxAgeSeconds(c.req.header("X-Jevcache-Max-Age-Seconds"));
    const classTtlMs = ttlMsForClass(reqClass, ttls, 0);
    const maxAgeMs =
      headerMaxAge != null ? headerMaxAge * 1000 : classTtlMs > 0 ? classTtlMs : undefined;

    const tenant = tenantFromAuth(auth, c.req.header("X-Jevcache-Tenant"));
    const model = String(body.model ?? "unknown");
    const baseNs = buildNamespace({
      tenant,
      model,
      systemHash: systemHash(body.messages),
      toolsHash: toolsHash(body),
      temperatureBucket: temperatureBucket(body.temperature, cfg.temperatureMax),
    });
    const digested = priorDigest(body.messages, {
      maxMessages: cfg.priorDigestMaxMessages,
      maxBytes: cfg.priorDigestMaxBytes,
    });
    const job = normalizeJobId(c.req.header("X-Jevcache-Job-Id"));
    const ns = turnNamespace(baseNs, digested.digest, job, { crossPrior: cfg.jobCrossPrior });
    const key = exactKey(ns, body);
    const turnTier = isTurnTier(digested.priorEmpty);
    const skipJev = priorEndsWithPendingToolCalls(body.messages, cfg.priorDigestMaxMessages);

    const exactRaw = store.getByExactKey(key);
    const exact = exactRaw && completionJsonStorable(exactRaw.response_json) ? exactRaw : null;
    if (exactRaw && !exact) store.delete(exactRaw.id);
    let missReason: string | undefined;
    if (exact && entryFreshForRequest(exact.created_at, reqClass, ttls, cfg, headerMaxAge)) {
      return serveHit(c, cfg, stats, hooks, emitHit, exact, "exact", undefined, reqClass, t0, body.stream === true, turnTier, ns, job);
    }
    if (exact && cfg.freshnessMode === "on") {
      stats.freshness_rejects += 1;
      missReason = "freshness_stale";
      if (cfg.shadow) {
        console.error(
          `[jevcache] freshness_reject exact age_ms=${Date.now() - exact.created_at} class=${reqClass}`,
        );
      }
    }

    const { value, shared } = await flight.do(key, async () => {
      const again = store.getByExactKey(key);
      if (again && entryFreshForRequest(again.created_at, reqClass, ttls, cfg, headerMaxAge)) {
        return { kind: "exact" as const, entry: again };
      }
      if (again && cfg.freshnessMode === "on") {
        stats.freshness_rejects += 1;
        missReason = missReason || "freshness_stale";
      }

      if (policy.mode === "full" && adjReady && !skipJev) {
        const cands: RankedCandidate[] = proposeCandidates({
          store,
          namespace: ns,
          newText: userText,
          k: cfg.candidateK,
          poolN: cfg.recentN,
          excludeExactKey: key,
          strategy: cfg.candidatePropose,
          maxAgeMs: cfg.freshnessMode === "on" ? maxAgeMs : undefined,
        });
        if (cands.length) {
          const oldestAge = maxCandidateAgeMs(cands);
          const askReuseFresh =
            cfg.freshnessMode === "on" &&
            reqClass !== "live" &&
            oldestAge >= cfg.freshnessJevMinAgeMs;
          const admit = await adjudicator.admit({
            newText: userText,
            candidates: cands.map(({ id, text }) => ({ id, text })),
            threshold: cfg.intentThreshold,
            maxStateChars: cfg.maxStateChars,
            timeoutMs: cfg.jevTimeoutMs,
            askReuseFresh,
          });
          stats.jev_spend_usd += admit.ok ? admit.costUsd : 0;
          if (!admit.ok) {
            stats.jev_errors += 1;
          } else if (admit.admit && !cfg.shadow) {
            const eid = entryIdForChoice(cands, admit.best);
            const loaded = eid ? store.getById(eid) : null;
            const entry = loaded && completionJsonStorable(loaded.response_json) ? loaded : null;
            if (loaded && !entry) store.delete(loaded.id);
            if (entry && entryFreshForRequest(entry.created_at, reqClass, ttls, cfg, headerMaxAge)) {
              return { kind: "jev" as const, entry, noul: admit.noul };
            }
            if (entry && cfg.freshnessMode === "on") {
              stats.freshness_rejects += 1;
              missReason = "freshness_stale";
            }
          } else if (admit.ok && !admit.admit && askReuseFresh) {
            if (
              admit.noul >= cfg.intentThreshold &&
              (admit.reuseFresh ?? 0) < cfg.intentThreshold
            ) {
              stats.freshness_rejects += 1;
              missReason = "freshness_reuse_refused";
            }
            if (cfg.shadow) {
              console.error(
                `[jevcache] freshness_shadow reuse_fresh noul=${admit.noul} reuse=${admit.reuseFresh}`,
              );
            }
          }
        }
      } else if (policy.mode === "full" && !adjReady) {
        // semantic disabled — exact only path continues to upstream
      }

      if (body.stream === true) {
        const streamed = await collectStream(cfg, body, upstreamKey, c.req.raw.signal);
        if (!streamed.ok) {
          return { kind: "upstream_error" as const, up: streamed.up };
        }
        const assembled = assembleSseText(streamed.sse, cfg.streamCacheMaxBytes);
        if (assembled.status === "incomplete") {
          if (assembled.reason === "stream_too_large") stats.stream_too_large += 1;
          else stats.stream_incomplete += 1;
          return {
            kind: "not_stored" as const,
            body: { error: { message: assembled.reason } },
            reason: assembled.reason,
            est: 0,
            sse: streamed.sse,
          };
        }
        if (assembled.status !== "stored_ready") {
          if (assembled.reason === "tool_calls") stats.tool_calls_bypass += 1;
          return {
            kind: "not_stored" as const,
            body: assembled.status === "not_storable" ? { error: { message: assembled.reason } } : {},
            reason: assembled.reason,
            est: 0,
            sse: streamed.sse,
          };
        }
        const stored = tryStore(store, cfg, {
          ns,
          key,
          userText,
          model,
          completion: assembled.completion,
          classText: userText,
        });
        if (!stored.ok) {
          return { kind: "not_stored" as const, body: assembled.completion, reason: stored.reason, est: stored.est, sse: streamed.sse };
        }
        return { kind: "miss" as const, entry: stored.entry, est: stored.est, sse: streamed.sse };
      }

      const up = await forwardChatCompletions({
        baseUrl: cfg.upstreamBaseUrl,
        apiKey: upstreamKey,
        body,
        timeoutMs: cfg.upstreamTimeoutMs,
        signal: c.req.raw.signal,
        mock: cfg.mockUpstream,
      });
      if (!up.ok) {
        return { kind: "upstream_error" as const, up };
      }
      const stored = tryStore(store, cfg, {
        ns,
        key,
        userText,
        model,
        completion: up.body,
        classText: userText,
      });
      if (!stored.ok) {
        if (stored.reason === "tool_calls") stats.tool_calls_bypass += 1;
        return { kind: "not_stored" as const, body: up.body, reason: stored.reason, est: stored.est };
      }
      return { kind: "miss" as const, entry: stored.entry, est: stored.est };
    });

    if (shared) stats.coalesced += 1;

    if (value.kind === "exact" || value.kind === "jev") {
      return serveHit(
        c,
        cfg,
        stats,
        hooks,
        emitHit,
        value.entry,
        value.kind,
        value.kind === "jev" ? value.noul : undefined,
        reqClass,
        t0,
        body.stream === true,
        turnTier,
        ns,
        job,
      );
    }

    if (value.kind === "upstream_error") {
      stats.upstream_errors += 1;
      pushLatency(stats.latency_miss_ms, Date.now() - t0);
      return c.json(value.up.body, value.up.status as 502);
    }

    if (value.kind === "not_stored") {
      stats.misses += 1;
      if (!shared) stats.upstream_spend_usd += value.est;
      pushLatency(stats.latency_miss_ms, Date.now() - t0);
      const reason = value.reason || missReason;
      if (body.stream === true && value.sse) {
        return sseResponse(value.sse, hitHeaders("MISS", "none", 0, "", undefined, reqClass, reason));
      }
      applyHeaders(c, hitHeaders("MISS", "none", 0, "", undefined, reqClass, reason));
      return c.json(value.body);
    }

    if (shared && body.stream === true) {
      const parsed = JSON.parse(value.entry.response_json) as Record<string, unknown>;
      stats.stream_hits += 1;
      const tier = turnTier ? "turn_exact" : "exact";
      countHit(stats, tier);
      stats.saved_usd += value.entry.est_cost_usd;
      return sseResponse(
        synthesizeHitSse(parsed, { model, id: hitId(value.entry.id) }),
        hitHeaders("HIT", tier, value.entry.est_cost_usd, value.entry.id, undefined, reqClass),
      );
    }

    stats.misses += 1;
    if (!shared) stats.upstream_spend_usd += value.est;
    pushLatency(stats.latency_miss_ms, Date.now() - t0);
    const parsed = JSON.parse(value.entry.response_json) as Record<string, unknown>;
    hooks.onMiss?.({
      spentUsd: value.est,
      preview: preview(redactSecrets(value.entry.user_text).text),
    });
    if (body.stream === true) {
      const sse = value.sse ?? synthesizeHitSse(parsed, { model, id: hitId(value.entry.id) });
      return sseResponse(sse, hitHeaders("MISS", "none", 0, value.entry.id, undefined, reqClass, missReason));
    }
    applyHeaders(c, hitHeaders("MISS", "none", 0, value.entry.id, undefined, reqClass, missReason));
    return c.json(parsed);
  });

  // Unsupported OpenAI surfaces
  app.all("/v1/responses", (c) =>
    c.json({ error: { message: "Responses API unsupported in jevcache v0; use /v1/chat/completions" } }, 501),
  );

  return {
    app,
    store,
    stats,
    config: cfg,
    close: () => store.close(),
  };
}

async function bypassUpstream(
  c: any,
  cfg: Config,
  body: ChatRequest,
  stats: Stats,
  t0: number,
  reason: string,
  upstreamKey?: string,
) {
  stats.bypasses += 1;
  const key = upstreamKey || cfg.upstreamApiKey;
  if (!key) return c.json({ error: { message: "missing upstream API key" } }, 401);
  if (body.stream === true) {
    if (process.env.MOCK_UPSTREAM === "1" || cfg.mockUpstream) {
      const chunk = {
        id: "chatcmpl-mock",
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: String(body.model ?? "mock"),
        choices: [{ index: 0, delta: { content: "MOCK_STREAM" }, finish_reason: null }],
      };
      const sse = `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`;
      return new Response(sse, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "X-Jevcache": "BYPASS",
          "X-Jevcache-Reason": reason,
        },
      });
    }
    const res = await fetch(`${cfg.upstreamBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: c.req.raw.signal,
    });
    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") ?? "text/event-stream");
    headers.set("X-Jevcache", "BYPASS");
    headers.set("X-Jevcache-Reason", reason);
    return new Response(res.body, { status: res.status, headers });
  }
  const up = await forwardChatCompletions({
    baseUrl: cfg.upstreamBaseUrl,
    apiKey: key,
    body,
    timeoutMs: cfg.upstreamTimeoutMs,
    signal: c.req.raw.signal,
  });
  pushLatency(stats.latency_miss_ms, Date.now() - t0);
  if (!up.ok) {
    stats.upstream_errors += 1;
    return c.json(up.body, up.status as 502);
  }
  const usage = usageFromBody(up.body);
  stats.upstream_spend_usd += estimateCostUsd(String(body.model ?? ""), usage.prompt, usage.completion);
  applyHeaders(c, { "X-Jevcache": "BYPASS", "X-Jevcache-Reason": reason });
  return c.json(up.body);
}


function completionJsonStorable(responseJson: string): boolean {
  try {
    return isStorableCompletion(JSON.parse(responseJson)).ok;
  } catch {
    return false;
  }
}

function hitId(entryId: string): string {
  return `chatcmpl-jevcache-${entryId.replace(/-/g, "").slice(0, 24)}`;
}

function countHit(stats: Stats, tier: "exact" | "jev" | "turn_exact" | "turn_jev"): void {
  if (tier === "turn_exact") {
    stats.hits_turn_exact += 1;
    stats.hits_exact += 1;
  } else if (tier === "turn_jev") {
    stats.hits_turn_jev += 1;
    stats.hits_jev += 1;
  } else if (tier === "exact") stats.hits_exact += 1;
  else stats.hits_jev += 1;
}

function sseResponse(sse: string, headers: Record<string, string>): Response {
  const h = new Headers(headers);
  h.set("Content-Type", "text/event-stream");
  return new Response(sse, { status: 200, headers: h });
}

function serveHit(
  c: { header: (k: string, v: string) => void; json: (b: unknown, s?: number) => Response },
  cfg: Config,
  stats: Stats,
  hooks: AppHooks,
  emitHit: (tier: "exact" | "jev" | "turn_exact" | "turn_jev", saved: number, preview: string, intent?: number) => void,
  entry: CacheEntry,
  kind: "exact" | "jev",
  noul: number | undefined,
  reqClass: FreshnessClass,
  t0: number,
  stream: boolean,
  turnTier: boolean,
  ns: string,
  job: string | null,
): Response {
  const tier = turnTier ? (kind === "exact" ? "turn_exact" : "turn_jev") : kind;
  countHit(stats, tier);
  if (stream) stats.stream_hits += 1;
  stats.saved_usd += entry.est_cost_usd;
  pushLatency(stats.latency_hit_ms, Date.now() - t0);
  const safePreview = preview(redactSecrets(entry.user_text).text);
  emitHit(tier, entry.est_cost_usd, safePreview, noul);
  if ((tier === "turn_exact" || tier === "turn_jev") && Math.random() < cfg.turnHitSampleRate) {
    stats.turn_hit_samples += 1;
    console.error(
      JSON.stringify({
        at: Date.now(),
        tier,
        ns16: ns.slice(0, 16),
        job,
        userPreview: safePreview,
        entryId: entry.id,
      }),
    );
  }
  const headers = hitHeaders("HIT", tier, entry.est_cost_usd, entry.id, noul, reqClass);
  const parsed = hitBody(entry.response_json, entry.id);
  if (stream) return sseResponse(synthesizeHitSse(parsed, { model: entry.model, id: String(parsed.id) }), headers);
  applyHeaders(c, headers);
  return c.json(parsed);
}

function tryStore(
  store: CacheStore,
  cfg: Config,
  input: {
    ns: string;
    key: string;
    userText: string;
    model: string;
    completion: Record<string, unknown>;
    classText: string;
  },
): { ok: true; entry: CacheEntry; est: number } | { ok: false; reason: string; est: number } {
  const check = isStorableCompletion(input.completion);
  const usage = usageFromBody(input.completion);
  const est = estimateCostUsd(input.model, usage.prompt, usage.completion);
  if (!check.ok) return { ok: false, reason: check.reason, est };
  const storeClass = cfg.freshnessMode === "off" ? "stable" : classifyFreshness(input.classText);
  const now = Date.now();
  const ttls = freshnessTtls(cfg);
  const ttlMs =
    cfg.freshnessMode === "off" ? cfg.ttlSeconds * 1000 : ttlMsForClass(storeClass, ttls, cfg.freshnessJitterPct);
  if (ttlMs <= 0) return { ok: false, reason: "ttl", est };
  try {
    const entry = store.upsert(
      {
        namespace: input.ns,
        exact_key: input.key,
        user_text: input.userText,
        response_json: JSON.stringify(input.completion),
        model: input.model,
        prompt_tokens: usage.prompt,
        completion_tokens: usage.completion,
        est_cost_usd: est,
        created_at: now,
        expires_at: now + ttlMs,
        freshness_class: storeClass,
        as_of: now,
      },
      cfg.maxEntries,
    );
    return { ok: true, entry, est };
  } catch {
    return { ok: false, reason: "store_error", est };
  }
}

async function collectStream(
  cfg: Config,
  body: ChatRequest,
  apiKey: string,
  signal: AbortSignal,
): Promise<{ ok: true; sse: string } | { ok: false; up: { status: number; body: unknown } }> {
  if (cfg.mockUpstream || process.env.MOCK_UPSTREAM === "1") {
    const last = [...(body.messages ?? [])].reverse().find((m) => m.role === "user");
    const content = typeof last?.content === "string" ? last.content : "ok";
    const created = Math.floor(Date.now() / 1000);
    const model = String(body.model ?? "mock");
    const chunk = {
      id: "chatcmpl-mock",
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: { role: "assistant", content: `MOCK_ANSWER:${content}` }, finish_reason: null }],
    };
    const stop = {
      id: "chatcmpl-mock",
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    };
    const sse = `data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify(stop)}\n\ndata: [DONE]\n\n`;
    return { ok: true, sse };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.upstreamTimeoutMs);
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort);
  try {
    const res = await fetch(`${cfg.upstreamBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const sse = await res.text();
    if (!res.ok) {
      let parsed: unknown = sse;
      try {
        parsed = JSON.parse(sse);
      } catch {
        /* */
      }
      return { ok: false, up: { status: res.status, body: parsed } };
    }
    return { ok: true, sse };
  } catch {
    return { ok: false, up: { status: 502, body: { error: { message: "upstream_error" } } } };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

function bearer(auth: string | undefined): string {
  if (!auth) return "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? "";
}

function hitBody(responseJson: string, entryId: string): Record<string, unknown> {
  const body = JSON.parse(responseJson) as Record<string, unknown>;
  body.id = `chatcmpl-jevcache-${entryId.replace(/-/g, "").slice(0, 24)}`;
  body.created = Math.floor(Date.now() / 1000);
  return body;
}

function applyHeaders(c: { header: (k: string, v: string) => void }, h: Record<string, string>) {
  for (const [k, v] of Object.entries(h)) c.header(k, v);
}

function hitHeaders(
  cache: string,
  tier: string,
  saved: number,
  entryId: string,
  intent?: number,
  freshness?: FreshnessClass,
  reason?: string,
): Record<string, string> {
  const h: Record<string, string> = {
    "X-Jevcache": cache,
    "X-Jevcache-Tier": tier,
    "X-Jevcache-Saved-USD": saved.toFixed(6),
    "X-Jevcache-Entry-Id": entryId,
  };
  if (intent != null) h["X-Jevcache-Intent"] = intent.toFixed(4);
  if (freshness) h["X-Jevcache-Freshness"] = freshness;
  if (reason) h["X-Jevcache-Reason"] = reason;
  return h;
}

function freshnessTtls(cfg: Config): FreshnessTtls {
  return {
    liveSeconds: cfg.ttlLiveSeconds,
    shortSeconds: cfg.ttlShortSeconds,
    stableSeconds: cfg.ttlSeconds,
    durableSeconds: cfg.ttlDurableSeconds,
  };
}

function parseMaxAgeSeconds(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function entryFreshForRequest(
  createdAt: number,
  reqClass: FreshnessClass,
  ttls: FreshnessTtls,
  cfg: Config,
  headerMaxAgeSec: number | null,
): boolean {
  if (cfg.freshnessMode === "off") return true;
  if (reqClass === "live") return false;
  if (headerMaxAgeSec != null) {
    return Date.now() - createdAt < headerMaxAgeSec * 1000;
  }
  return isFreshEnough(createdAt, reqClass, ttls);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
