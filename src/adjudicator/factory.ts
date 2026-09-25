/** SPDX-License-Identifier: MIT */
import type { Config } from "../config.js";
import { createJevAdjudicator } from "./jev_backend.js";
import { createMockAdjudicator } from "./mock_backend.js";
import {
  createBrokenAdjudicator,
  createSystemOneAdjudicator,
} from "./systemone_backend.js";
import type { IntentAdjudicator } from "./types.js";
import { normalizeSystemOneUrl } from "./url.js";

export type AdjudicatorKind =
  | "jev"
  | "mock"
  | "laya"
  | "laya-mlx"
  | "kev"
  | "systemone"
  | "local"
  | "unknown";

const SYSTEM_ONE_KINDS = new Set<AdjudicatorKind>([
  "laya",
  "laya-mlx",
  "kev",
  "systemone",
  "local",
]);

export function isSystemOneKind(kind: AdjudicatorKind): boolean {
  return SYSTEM_ONE_KINDS.has(kind);
}

/**
 * Resolve backend. Default Jev. MOCK_JEV=1 or ADJUDICATOR=mock → mock.
 * Unknown kinds → "unknown" (no silent Jev fallback).
 */
export function resolveAdjudicatorKind(cfg: Config): AdjudicatorKind {
  const raw = (cfg.adjudicator || "").toLowerCase().trim();
  if (raw === "mock" || cfg.mockJev) return "mock";
  if (raw === "jev" || !raw) return "jev";
  if (raw === "laya") return "laya";
  if (raw === "laya-mlx") return "laya-mlx";
  if (raw === "kev") return "kev";
  if (raw === "systemone") return "systemone";
  if (raw === "local") return "local";
  return "unknown";
}

export type ResolvedEndpoint = {
  url: string;
  model: string;
  hostLabel: string;
};

/** Resolve System One URL + model for a local/self-hosted kind. */
export function resolveSystemOneEndpoint(
  cfg: Config,
  kind: AdjudicatorKind,
): ResolvedEndpoint | null {
  if (!isSystemOneKind(kind)) return null;

  let base = (cfg.adjudicatorUrl || "").trim();
  let model = (cfg.adjudicatorModel || "").trim();

  if (kind === "kev") {
    if (!base) base = "http://127.0.0.1:8008";
    if (!model) model = "kev-latest";
  } else if (kind === "laya") {
    if (!base) base = "http://127.0.0.1:8000";
    if (!model) model = "laya-latest";
  } else if (kind === "laya-mlx") {
    if (!base) {
      base =
        (process.env.LAYA_MLX_URL || "").trim() ||
        (cfg.adjudicatorUrl || "").trim() ||
        "http://127.0.0.1:8000";
    }
    if (!model) {
      model =
        (process.env.LAYA_MLX_MODEL || "").trim() ||
        (cfg.adjudicatorModel || "").trim() ||
        "laya-latest";
    }
  } else {
    // systemone | local — URL and model required
    if (!base || !model) return null;
  }

  const url = normalizeSystemOneUrl(base);
  if (!url || !model) return null;

  let hostLabel = base;
  try {
    hostLabel = new URL(url).host;
  } catch {
    /* keep base */
  }
  return { url, model, hostLabel };
}

/**
 * Whether the semantic admit path should run for this config.
 * Injected adjudicators bypass this in the server (tests / custom).
 */
export function adjudicatorReady(cfg: Config): boolean {
  const kind = resolveAdjudicatorKind(cfg);
  if (kind === "mock" || cfg.mockJev) return true;
  if (kind === "jev") return !!cfg.openrouterApiKey.trim();
  if (isSystemOneKind(kind)) {
    return resolveSystemOneEndpoint(cfg, kind) !== null;
  }
  return false;
}

export function createAdjudicator(cfg: Config): IntentAdjudicator {
  const kind = resolveAdjudicatorKind(cfg);

  if (kind === "mock") return createMockAdjudicator();

  if (kind === "jev") {
    if (!cfg.openrouterApiKey.trim()) {
      return createBrokenAdjudicator("jev", "missing_openrouter_api_key");
    }
    return createJevAdjudicator({
      apiKey: cfg.openrouterApiKey,
      model: cfg.jevModel,
      // B47: kind=jev → Decisions URL override only
      decisionsUrl: cfg.adjudicatorUrl || undefined,
    });
  }

  if (isSystemOneKind(kind)) {
    const ep = resolveSystemOneEndpoint(cfg, kind);
    if (!ep) {
      return createBrokenAdjudicator(
        kind,
        `missing_adjudicator_url_or_model for ADJUDICATOR=${kind}`,
      );
    }
    if (cfg.candidateK > 7) {
      console.error(
        `[jevcache] CANDIDATE_K=${cfg.candidateK} exceeds System One choice soft-cap (7); capping for admit.`,
      );
    }
    return createSystemOneAdjudicator({
      name: kind,
      url: ep.url,
      model: ep.model,
      apiKey: cfg.adjudicatorApiKey || undefined,
    });
  }

  console.error(
    `[jevcache] Unknown ADJUDICATOR=${cfg.adjudicator}; semantic admit disabled (exact-only).`,
  );
  return createBrokenAdjudicator(
    "unknown",
    `unknown_adjudicator:${cfg.adjudicator || "(empty)"}`,
  );
}

/** Short banner line: kind + host (no secrets). */
export function adjudicatorBanner(cfg: Config): string {
  const kind = resolveAdjudicatorKind(cfg);
  if (kind === "mock" || cfg.mockJev) return "mock (synthetic)";
  if (kind === "jev") {
    const host = cfg.adjudicatorUrl
      ? (() => {
          try {
            return new URL(cfg.adjudicatorUrl).host;
          } catch {
            return "custom-decisions";
          }
        })()
      : "openrouter.ai";
    return adjudicatorReady(cfg) ? `jev Decisions (${host})` : "jev (not ready — need OPENROUTER_API_KEY)";
  }
  if (isSystemOneKind(kind)) {
    const ep = resolveSystemOneEndpoint(cfg, kind);
    if (!ep) return `${kind} (not ready — set ADJUDICATOR_URL + ADJUDICATOR_MODEL)`;
    return `${kind} System One (${ep.hostLabel})`;
  }
  return `unknown (${cfg.adjudicator}) — exact-only`;
}
