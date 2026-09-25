/** SPDX-License-Identifier: MIT */
import { Hono } from "hono";
import { createHash, randomUUID } from "node:crypto";
import type { Config } from "./config.js";
import {
  buildNamespace,
  exactKey,
  lastUserText,
  systemHash,
  temperatureBucket,
  toolsHash,
  type ChatRequest,
} from "./fingerprint.js";
import { decidePolicy } from "./policy.js";
import { CacheStore } from "./store/sqlite.js";
import { SingleFlight } from "./singleflight.js";
import { createAdjudicator, adjudicatorReady, resolveAdjudicatorKind } from "./adjudicator/index.js";
import type { IntentAdjudicator } from "./adjudicator/types.js";
import {
  recentCandidates,
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
import { preview } from "./redact.js";
import {
  classifyFreshness,
  isFreshEnough,
  ttlMsForClass,
  type FreshnessClass,
  type FreshnessTtls,
} from "./freshness.js";

export type CacheHitEvent = {
  tier: "exact" | "jev";
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
    tier: "exact" | "jev",
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
        "Authorization, Content-Type, X-Jevcache-Admin, X-Jevcache-Tenant, X-Jevcache-Bypass, X-Jevcache-Max-Age-Seconds",
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
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>jevcache stats</title>
<style>body{font-family:ui-sans-serif,system-ui;max-width:720px;margin:2rem auto;padding:0 1rem;background:#0b0f14;color:#e7eef7}
h1{font-size:1.4rem} .grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem} .card{background:#151b24;border-radius:12px;padding:1rem}
.muted{color:#8b9bb0;font-size:.85rem} table{width:100%;border-collapse:collapse} td,th{padding:.35rem 0;border-bottom:1px solid #243041;text-align:left}
.big{font-size:1.6rem;font-weight:700}</style></head><body>
<h1>jevcache</h1>
<p class="muted">Routers pick a model. jevcache decides whether to call one. Estimates only.</p>
<div class="grid">
<div class="card"><div class="muted">Hit rate</div><div class="big">${(s.hit_rate * 100).toFixed(1)}%</div></div>
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

  app.post("/v1/chat/completions", async (c) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!limiter.allow(ip)) return c.json({ error: { message: "rate_limited" } }, 429);

    stats.requests += 1;
    const t0 = Date.now();
    let body: ChatRequest;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { message: "invalid_json" } }, 400);
    }
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return c.json({ error: { message: "messages required" } }, 400);
    }

    const auth = c.req.header("Authorization");
    const upstreamKey = bearer(auth) || cfg.upstreamApiKey;

    if (c.req.header("X-Jevcache-Bypass") === "1") {
      return bypassUpstream(c, cfg, body, stats, t0, "client_bypass", upstreamKey);
    }

    const policy = decidePolicy(body, cfg.temperatureMax, { freshnessMode: cfg.freshnessMode });
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
    const ns = buildNamespace({
      tenant,
      model,
      systemHash: systemHash(body.messages),
      toolsHash: toolsHash(body),
      temperatureBucket: temperatureBucket(body.temperature, cfg.temperatureMax),
    });
    const key = exactKey(ns, body);

    const exact = store.getByExactKey(key);
    let missReason: string | undefined;
    if (exact && entryFreshForRequest(exact.created_at, reqClass, ttls, cfg, headerMaxAge)) {
      stats.hits_exact += 1;
      stats.saved_usd += exact.est_cost_usd;
      pushLatency(stats.latency_hit_ms, Date.now() - t0);
      emitHit("exact", exact.est_cost_usd, preview(exact.user_text));
      applyHeaders(c, hitHeaders("HIT", "exact", exact.est_cost_usd, exact.id, undefined, reqClass));
      return c.json(hitBody(exact.response_json, exact.id));
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

      if (policy.mode === "full" && adjReady) {
        const cands: RankedCandidate[] = recentCandidates(store, ns, cfg.candidateK, key, {
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
            const entry = eid ? store.getById(eid) : null;
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

      const up = await forwardChatCompletions({
        baseUrl: cfg.upstreamBaseUrl,
        apiKey: upstreamKey,
        body,
        timeoutMs: cfg.upstreamTimeoutMs,
      });
      if (!up.ok) {
        return { kind: "upstream_error" as const, up };
      }
      const usage = usageFromBody(up.body);
      const est = estimateCostUsd(model, usage.prompt, usage.completion);
      const storeClass =
        cfg.freshnessMode === "off" ? ("stable" as const) : classifyFreshness(userText);
      const now = Date.now();
      const ttlMs =
        cfg.freshnessMode === "off"
          ? cfg.ttlSeconds * 1000
          : ttlMsForClass(storeClass, ttls, cfg.freshnessJitterPct);
      // live should not store (bypassed above); if somehow here, expire immediately
      const expires_at = ttlMs <= 0 ? now : now + ttlMs;
      const entry = store.upsert(
        {
          namespace: ns,
          exact_key: key,
          user_text: userText,
          response_json: JSON.stringify(up.body),
          model,
          prompt_tokens: usage.prompt,
          completion_tokens: usage.completion,
          est_cost_usd: est,
          created_at: now,
          expires_at,
          freshness_class: storeClass,
          as_of: now,
        },
        cfg.maxEntries,
      );
      return { kind: "miss" as const, entry, est };
    });

    if (shared) stats.coalesced += 1;

    if (value.kind === "exact" || value.kind === "jev") {
      if (value.kind === "exact") stats.hits_exact += 1;
      else stats.hits_jev += 1;
      stats.saved_usd += value.entry.est_cost_usd;
      pushLatency(stats.latency_hit_ms, Date.now() - t0);
      const tier = value.kind === "exact" ? "exact" : "jev";
      emitHit(
        tier,
        value.entry.est_cost_usd,
        preview(value.entry.user_text),
        value.kind === "jev" ? value.noul : undefined,
      );
      applyHeaders(
        c,
        hitHeaders(
          "HIT",
          tier,
          value.entry.est_cost_usd,
          value.entry.id,
          value.kind === "jev" ? value.noul : undefined,
          reqClass,
        ),
      );
      return c.json(hitBody(value.entry.response_json, value.entry.id));
    }

    if (value.kind === "upstream_error") {
      stats.upstream_errors += 1;
      pushLatency(stats.latency_miss_ms, Date.now() - t0);
      return c.json(value.up.body, value.up.status as 502);
    }

    stats.misses += 1;
    stats.upstream_spend_usd += value.est;
    pushLatency(stats.latency_miss_ms, Date.now() - t0);
    const parsed = JSON.parse(value.entry.response_json);
    hooks.onMiss?.({
      spentUsd: value.est,
      preview: preview(value.entry.user_text),
    });
    applyHeaders(
      c,
      hitHeaders("MISS", "none", 0, value.entry.id, undefined, reqClass, missReason),
    );
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
